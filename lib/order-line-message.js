import productPrices from "./product-prices.json";
import productIngredients from "./product-ingredients.json";

const money = value => `NT$${Number(value).toLocaleString("zh-TW")}`;
export function getOrderAmounts(order) {
  const basePrice = productPrices[order.product]?.[order.size];
  const extraPrice = Number(order.extraStrawberryPrice || 0);
  return {
    basePrice: Number.isFinite(basePrice) ? basePrice : null,
    extraPrice,
    total: Number.isFinite(basePrice) ? basePrice + extraPrice : null,
  };
}
// LINE 訊息專用日期格式；不改動原始訂單日期或其他畫面。
export function formatLinePickupDate(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (!match) return raw || "未填";
  const [, year, month, day] = match;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const date = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== iso) return raw;
  return `${iso.replace(/-/g, "/")}（${"日一二三四五六"[date.getUTCDay()]}）`;
}

const originalCakeBodies = new Set([
  "原味戚風蛋糕", "巧克力戚風蛋糕", "焙茶戚風蛋糕", "可可戚風蛋糕", "原味蛋糕",
]);

export function orderLineDetails(order) {
  const { basePrice, extraPrice, total } = getOrderAmounts(order);
  const cakeBody = String(order.cakeBody || "").trim();
  // 已有客人選擇的蛋糕體時，以其選擇為準；保留所有其餘原配方材料。
  const ingredients = (productIngredients[order.product] || []).filter(
    item => !cakeBody || (item !== cakeBody && !originalCakeBodies.has(item)),
  );
  const otherAddons = String(order.otherAddons || "").trim();
  return [
    "▍訂購資訊",
    `訂單編號：${order.orderId}`,
    `訂購人：${order.name || "未填"}`,
    `聯絡手機：${order.phone || "未填"}`,
    `LINE 名稱：${order.lineName || "未填"}`,
    "",
    "▍取貨資訊",
    `取貨日期：${formatLinePickupDate(order.date)}`,
    `取貨時間：${order.pickupTime || "未填"}`,
    "",
    "▍蛋糕明細",
    `蛋糕品項：${order.product || "未填"}`,
    `蛋糕尺寸：${order.size || "未填"}`,
    `蛋糕體：${cakeBody || "依商品原配方"}`,
    `商品內餡／材料：${ingredients.join("、") || "請洽店家確認"}`,
    `蛋糕價格：${basePrice === null ? "請洽店家確認" : money(basePrice)}`,
    ...(order.extraStrawberry ? [`內餡加購：新鮮草莓 +${money(extraPrice)}`] : []),
    ...(otherAddons && otherAddons !== "無" ? [`其他加購：${otherAddons}`] : []),
    "",
    "▍客製需求",
    `用途：${order.occasion || "未填"}`,
    `備註（含蛋糕文字／蠟燭／盤叉）：${order.note || "無"}`,
    "",
    "────────────",
    "▍付款資訊",
    `訂單總金額：${total === null ? "請洽店家確認" : money(total)}`,
    `付款方式：${order.paymentLabel || "銀行轉帳匯款"}`,
  ].join("\n");
}

export function customerOrderLineMessage(order) {
  return [
    "🍰 初甜趣｜訂單明細",
    "────────────",
    orderLineDetails(order),
    "訂單狀態：待付款／待店家確認",
    "",
    "銀行：連線銀行（824）",
    "匯款帳號：111018312187",
    "",
    "轉帳完成後，請直接在此對話上傳付款截圖。",
    "店家確認款項後，LINE 會另行通知訂單正式成立。",
    "",
    "謝謝您選擇初甜趣手作甜點 ♡",
  ].join("\n");
}

export function paymentConfirmedLineMessage(order) {
  return [
    "🍰 初甜趣｜訂單成立通知",
    "────────────",
    "",
    "您好，已收到您的款項，訂單正式成立！",
    "",
    `訂單編號：${order.orderId}`,
    `取貨日期：${formatLinePickupDate(order.date)}`,
    `取貨時間：${order.pickupTime || "未填"}`,
    "",
    "我們將依照您預約的日期製作蛋糕，期待與您見面。",
    "",
    "謝謝您的支持與喜愛 ♡",
    "初甜趣手作甜點",
  ].join("\n");
}
