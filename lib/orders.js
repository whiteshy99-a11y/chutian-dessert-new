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

export async function saveOrder(order) {
  const key = `chutian:order:${order.orderId}`;
  const saved = await redis(["set", key, JSON.stringify(order)]);
  if (!saved) return false;
  await redis(["lpush", "chutian:orders", order.orderId]);
  await redis(["ltrim", "chutian:orders", "0", "999"]);
  return true;
}

export async function getOrder(orderId) {
  const item = await redis(["get", `chutian:order:${orderId}`]);
  return item?.result ? JSON.parse(item.result) : null;
}

export async function getOrders() {
  const list = await redis(["lrange", "chutian:orders", "0", "999"]);
  if (!list?.result?.length) return [];
  const orders = [];
  for (const id of list.result) {
    const order = await getOrder(id);
    if (order) orders.push(order);
  }
  return orders;
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
