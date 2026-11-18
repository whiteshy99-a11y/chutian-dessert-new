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
export function orderLineDetails(order) {
  const { basePrice, extraPrice, total } = getOrderAmounts(order);
  return [
    `訂單編號：${order.orderId}`,
    `訂購人：${order.name || "未填"}`,
    `手機號碼：${order.phone || "未填"}`,
    `LINE 名稱：${order.lineName || "未填"}`,
    `取貨日期：${order.date || "未填"}`,
    `取貨時間：${order.pickupTime || "未填"}`,
    `蛋糕：${order.product || "未填"}`,
    `尺寸：${order.size || "未填"}`,
    `蛋糕價格：${basePrice === null ? "請洽店家確認" : money(basePrice)}`,
    `蛋糕體選擇：${order.cakeBody || "依商品原配方"}`,
    `商品內餡／材料：${(productIngredients[order.product] || []).join("、") || "請洽店家確認"}`,
    `內餡加購：${order.extraStrawberry ? `新鮮草莓 +${money(extraPrice)}` : "無"}`,
    `其他加購：${order.otherAddons || "無"}`,
    `用途：${order.occasion || "未填"}`,
    `備註（含蛋糕文字／蠟燭／盤叉）：${order.note || "無"}`,
    `訂單總金額：${total === null ? "請洽店家確認" : money(total)}`,
    `付款方式：${order.paymentLabel || "銀行轉帳匯款"}`,
  ].join("\n");
}
export function customerOrderLineMessage(order) {
  return [
    "🍰 初甜趣｜訂單明細",
    "────────────",
    orderLineDetails(order),
    "────────────",
    "💳 匯款資訊",
    "銀行：連線銀行（824）",
    "匯款帳號：111018312187",
    "訂單狀態：待付款／待店家確認",
    "轉帳完成後，請直接在此對話上傳付款截圖。",
    "店家確認款項後，LINE 會另行通知訂單正式成立。",
  ].join("\n");
}
