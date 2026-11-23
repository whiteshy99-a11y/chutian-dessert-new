import Redis from "ioredis";
import { getRedisEnv } from "./redis-env";

function getTcpClient(url) {
  if (!url) return null;
  if (!globalThis.__chutianRedisClient) {
    globalThis.__chutianRedisClient = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 8000,
      tls: url.startsWith("rediss://") ? {} : undefined,
    });
    globalThis.__chutianRedisClient.on("error", (error) => {
      console.error("Redis connection error", error?.message || error);
    });
  }
  return globalThis.__chutianRedisClient;
}

async function restRedis(command, url, token) {
  // 使用 Upstash REST 的 POST JSON 格式，避免指令內容含空白、斜線或中文字時
  // 因 URL path 編碼造成請求失敗。
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command.map((part) => String(part))),
    cache: "no-store",
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `Redis REST request failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Redis REST returned an invalid response.");
  }
}

async function tcpRedis(command, url) {
  const client = getTcpClient(url);
  if (!client) return null;
  if (client.status === "wait") await client.connect();
  const result = await client.call(...command.map((part) => String(part)));
  return { result };
}

export async function redis(command) {
  const env = getRedisEnv();
  if (!env.configured) return null;
  if (env.restConfigured) return restRedis(command, env.restUrl, env.restToken);
  return tcpRedis(command, env.tcpUrl);
}

export async function pingRedis() {
  const result = await redis(["ping"]);
  return result?.result === "PONG";
}

export async function nextOrderId() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const v = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const day = `${v.year}${v.month}${v.day}`;
  const result = await redis(["incr", `chutian:order-sequence:${day}`]);
  const sequence = Number(result?.result || 0);
  if (!sequence) return `CT${day}${String(Date.now()).slice(-6)}`;
  return `CT${day}${String(sequence).padStart(4, "0")}`;
}

// EVAL 由 Redis 單執行緒原子執行：訂單資料、後台索引、重送識別碼一起寫入。
// 若任一前置檢查失敗，完全不修改資料；同一 requestId 只會建立一筆訂單。
const SAVE_ORDER_ATOMIC = `
local existing = redis.call('GET', KEYS[3])
if existing then
  return {2, existing}
end
if redis.call('EXISTS', KEYS[1]) == 1 then
  return redis.error_reply('ORDER_ID_COLLISION')
end
redis.call('SET', KEYS[1], ARGV[1])
redis.call('LPUSH', KEYS[2], ARGV[2])
redis.call('LTRIM', KEYS[2], 0, 999)
redis.call('SET', KEYS[3], ARGV[2], 'EX', 604800)
return {1, ARGV[2]}
`;

export async function saveOrder(order, requestId) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(String(requestId || ""))) {
    throw new Error("缺少有效的訂單送出識別碼");
  }
  const response = await redis([
    "eval", SAVE_ORDER_ATOMIC, "3",
    `chutian:order:${order.orderId}`, "chutian:orders",
    `chutian:order-request:${requestId}`,
    JSON.stringify(order), order.orderId,
  ]);
  if (response?.error) throw new Error(`Redis 儲存失敗：${response.error}`);
  const result = response?.result;
  if (!Array.isArray(result) || ![1, 2].includes(Number(result[0])) ||
      !/^CT\d{12}$/.test(String(result[1] || ""))) {
    throw new Error("無法確認 Redis 原子寫入結果");
  }
  return { orderId: String(result[1]), created: Number(result[0]) === 1 };
}

// 若原子寫入已經完成，但網路在回傳前中斷，可用同一請求識別碼查回原訂單。
export async function findOrderByRequestId(requestId) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(String(requestId || ""))) return null;
  const response = await redis(["get", `chutian:order-request:${requestId}`]);
  const id = String(response?.result || "");
  if (!/^CT\d{12}$/.test(id)) return null;
  const order = await getOrder(id);
  return order ? id : null;
}

export async function getOrder(orderId) {
  const item = await redis(["get", `chutian:order:${orderId}`]);
  return item?.result ? JSON.parse(item.result) : null;
}

export async function getOrders() {
  const list = await redis(["lrange", "chutian:orders", "0", "999"]);
  if (!list?.result?.length) return [];

  // 一次批次讀取訂單，避免後台開啟時對 Redis 逐筆發出最多 1000 次請求。
  // 這會保留原本最多 1000 筆訂單的行為，但大幅減少網路往返時間。
  const keys = list.result.map((id) => `chutian:order:${id}`);
  try {
    const batch = await redis(["mget", ...keys]);
    if (Array.isArray(batch?.result)) {
      return batch.result.flatMap((item) => {
        if (!item) return [];
        try {
          return [JSON.parse(item)];
        } catch {
          return [];
        }
      });
    }
  } catch (error) {
    console.error("Redis MGET failed; falling back to individual reads", error?.message || error);
  }

  // 相容少數不支援 MGET 的 Redis 環境。
  const items = await Promise.all(list.result.map((id) => getOrder(id)));
  return items.filter(Boolean);
}

export async function saveOrderObject(order) {
  const saved = await redis(["set", `chutian:order:${order.orderId}`, JSON.stringify(order)]);
  if (!saved) throw new Error("訂單資料庫尚未完成設定。");
  return order;
}

export async function bindLineUser(orderId, lineUserId) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("找不到訂單");
  const updated = {
    ...order,
    lineUserId,
    lineBoundAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveOrderObject(updated);
  await redis(["set", `chutian:line-user-order:${lineUserId}`, orderId]);
  return updated;
}

export async function getBoundOrderId(lineUserId) {
  const result = await redis(["get", `chutian:line-user-order:${lineUserId}`]);
  return String(result?.result || "").trim();
}

export async function updateOrderStatus(orderId, status) {
  const allowed = ["待付款", "已付款", "已取消"];
  if (!allowed.includes(status)) throw new Error("不支援的訂單狀態");
  const order = await getOrder(orderId);
  if (!order) throw new Error("找不到訂單");
  const now = new Date().toISOString();
  const updated = { ...order, status, updatedAt: now };
  if (status === "已付款") updated.paymentConfirmedAt = now;
  if (status === "已取消") updated.cancelledAt = now;
  if (status === "待付款") {
    delete updated.paymentConfirmedAt;
    delete updated.cancelledAt;
  }
  await saveOrderObject(updated);
  return updated;
}

// 紙本登記與永久刪除皆只允許後台 API 呼叫。
export async function setPaperRegistered(orderId, registered) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("找不到訂單");
  const updated = {...order, paperRegistered: Boolean(registered), paperRegisteredAt: registered ? new Date().toISOString() : null, updatedAt: new Date().toISOString()};
  return saveOrderObject(updated);
}

export async function deleteCancelledOrder(orderId) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("找不到訂單");
  if (order.status !== "已取消") throw new Error("只有已取消的訂單才能永久刪除");
  // 先移除列表索引，再刪除資料；失敗時不會留下可見的幽靈訂單。
  await redis(["lrem", "chutian:orders", "0", orderId]);
  await redis(["del", `chutian:order:${orderId}`]);
  if (order.lineUserId) {
    const bound = await redis(["get", `chutian:line-user-order:${order.lineUserId}`]);
    if (bound?.result === orderId) await redis(["del", `chutian:line-user-order:${order.lineUserId}`]);
  }
  return {orderId};
}
