import { getRedisEnv } from "./redis-env";

export async function redis(command) {
  const { url, token, configured } = getRedisEnv();
  if (!configured) return null;
  const endpoint = `${url}/${command.map((part) => encodeURIComponent(String(part))).join("/")}`;
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const body = await response.text();
  if (!response.ok) throw new Error(`Redis request failed (${response.status}): ${body.slice(0, 300)}`);
  try { return JSON.parse(body); } catch { throw new Error("Redis returned an invalid response."); }
}

export async function nextOrderId() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Taipei", year:"numeric", month:"2-digit", day:"2-digit" }).formatToParts(now);
  const v = Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const day = `${v.year}${v.month}${v.day}`;
  const result = await redis(["incr", `chutian:order-sequence:${day}`]);
  const sequence = Number(result?.result || 0);
  if (!sequence) return `CT${day}${String(Date.now()).slice(-6)}`;
  return `CT${day}${String(sequence).padStart(4,"0")}`;
}

export async function saveOrder(order) {
  const key = `chutian:order:${order.orderId}`;
  const saved = await redis(["set", key, JSON.stringify(order)]);
  if (!saved) return false;
  await redis(["lpush", "chutian:orders", order.orderId]);
  await redis(["ltrim", "chutian:orders", "0", "499"]);
  return true;
}

export async function getOrder(orderId) {
  const item = await redis(["get", `chutian:order:${orderId}`]);
  return item?.result ? JSON.parse(item.result) : null;
}

export async function getOrders() {
  const list = await redis(["lrange", "chutian:orders", "0", "499"]);
  if (!list?.result?.length) return [];
  const orders = [];
  for (const id of list.result) {
    const order = await getOrder(id);
    if (order) orders.push(order);
  }
  return orders;
}

export async function saveOrderObject(order) {
  await redis(["set", `chutian:order:${order.orderId}`, JSON.stringify(order)]);
  return order;
}

export async function bindLineUser(orderId, lineUserId) {
  const order = await getOrder(orderId);
  if (!order) throw new Error("找不到訂單");
  const updated = { ...order, lineUserId, lineBoundAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
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
  await saveOrderObject(updated);
  return updated;
}
