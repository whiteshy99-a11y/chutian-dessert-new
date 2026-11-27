// 優先使用新列印紀錄；舊紙本已登記視為已列印，不改動原訂單及付款資料。
export const PRINT_STATE_KEY = "chutian:order-print-confirmations:v1";
export function printState(order) {
  const record = order.printRecord;
  if (record?.printed === true) return "已列印";
  if (record?.printed === false) return "尚未列印";
  return order.paperRegistered ? "已列印" : "尚未列印";
}
export function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function pickupMatches(order, mode, selected, today) {
  const date = String(order.date || "");
  if (mode === "全部") return true;
  if (mode === "今日") return date === today;
  if (mode === "明日") return date === addDays(today, 1);
  if (mode === "未來7天") return date >= today && date <= addDays(today, 6);
  if (mode === "自選日期") return !!selected && date === selected;
  return true;
}
export function comparePickup(a, b, today) {
  const key = o => `${o.date || "9999-99-99"} ${o.pickupTime || "99:99"}`;
  const ak = key(a), bk = key(b);
  const ap = ak.slice(0,10) < today, bp = bk.slice(0,10) < today;
  if (ap !== bp) return ap ? 1 : -1;
  return (ap ? bk.localeCompare(ak) : ak.localeCompare(bk)) || String(a.orderId).localeCompare(String(b.orderId));
}
export function matchesPrint(order, filter) {
  const state = printState(order);
  return filter === "全部" || state === filter;
}
