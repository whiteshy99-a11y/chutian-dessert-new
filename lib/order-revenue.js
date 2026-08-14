const PRICE_TABLE = [
  ["水果焦香巴斯克（水果依季節搭配）", {"6 吋":780}],
  ["水果季（水果依季節搭配）", {"4 吋":680,"6 吋":850,"8 吋":1250}],
  ["藍莓森林", {"4 吋":580,"6 吋":780,"8 吋":1180}],
  ["夏日芒果", {"4 吋":680,"6 吋":850,"8 吋":1250}],
  ["聖安娜焙茶", {"6 吋":850,"8 吋":1250}],
  ["二次元蛋糕", {"6 吋":880,"8 吋":1280}],
  ["老奶奶檸檬糖霜蛋糕", {"6 吋":380}],
  ["芋泥小花", {"4 吋":580,"6 吋":780,"8 吋":1180,"10 吋":1780,"12 吋":2100}],
  ["綠葡萄難哄", {"4 吋":580,"6 吋":780,"8 吋":1180}],
  ["綠葡萄小清新", {"4 吋":580,"6 吋":780,"8 吋":1180,"10 吋":1780}],
  ["操灰搭", {"4 吋":680,"6 吋":980,"8 吋":1280}],
  ["藍莓巧克力難哄（水果依季節搭配）", {"4 吋":680,"6 吋":980,"8 吋":1280}],
  ["蜜柑伯爵奶凍焙茶", {"4 吋":580,"6 吋":780,"8 吋":1180}],
  ["黑櫻桃巧克力裸蛋糕", {"4 吋":680,"6 吋":850,"8 吋":1250}],
  ["水果裸蛋糕（水果依季節搭配）", {"5 吋":798,"7 吋":1288}],
  ["草莓香緹", {"6 吋":780,"8 吋":1180}],
];

function normalizeSize(size) {
  return String(size || "").replace(/\s+/g, " ").trim();
}

export function getOrderAmount(order) {
  const explicit = Number(order?.amount || order?.total || 0);
  if (explicit > 0) return explicit;
  const name = String(order?.product || "").trim();
  const row = PRICE_TABLE.find(([product]) => product === name);
  if (!row) return 0;
  const size = normalizeSize(order?.size);
  return Number(row[1][size] || 0);
}

function taipeiDate(value) {
  if (!value) return "";
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value));
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    return "";
  }
}

export function summarizeWebsiteMonth(orders, month) {
  const paid = (orders || []).filter((order) => {
    if (order.status !== "已付款") return false;
    const paidAt = order.paymentConfirmedAt || order.updatedAt || order.createdAt;
    return taipeiDate(paidAt).startsWith(`${month}-`);
  });

  const dayMap = new Map();
  const unpriced = [];
  let revenue = 0;

  for (const order of paid) {
    const paidAt = order.paymentConfirmedAt || order.updatedAt || order.createdAt;
    const date = taipeiDate(paidAt);
    const amount = getOrderAmount(order);
    if (amount <= 0) unpriced.push(order.orderId);
    revenue += Math.max(0, amount);

    if (!dayMap.has(date)) dayMap.set(date, { date, revenue: 0, count: 0, orders: [] });
    const day = dayMap.get(date);
    day.revenue += Math.max(0, amount);
    day.count += 1;
    day.orders.push({
      orderId: order.orderId,
      name: order.name || "",
      product: order.product || "",
      size: order.size || "",
      amount: Math.max(0, amount),
      paidAt,
      pickupDate: order.date || "",
      pickupTime: order.pickupTime || "",
    });
  }

  return {
    revenue,
    count: paid.length,
    unpriced,
    days: [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date)),
  };
}
