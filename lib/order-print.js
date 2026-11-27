// 純前端列印：不發送網路請求、不修改訂單及紙本登記狀態。
import { getOrderAmounts } from "./order-line-message";

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const show = (v) => v === undefined || v === null || v === "" ? "—" : esc(v);
const number = (v) => String(v || "").replace(/\D/g, "");

export function buildOrderPrintHtml(order) {
  const o = order || {};
  const phone = String(o.phone || "");
  const lastFour = number(phone).slice(-4) || "—";
  const date = String(o.date || o.pickupDate || "—");
  const extras = [];
  if (o.extraStrawberry) extras.push(`新鮮草莓${o.extraStrawberryPrice ? `（+$${o.extraStrawberryPrice}）` : ""}`);
  // 若未來後台訂單擴充其他加購欄位，優先顯示已有的文字描述。
  for (const k of ["otherAddons", "extrasText", "addOnsText", "addonsText"]) if (o[k] && String(o[k]).trim() !== "無") extras.push(String(o[k]));
  const pickup = show(date);
  const lineName = String(o.lineName || "").trim();
  // 優先採用訂單已儲存的總額；舊訂單沿用 LINE 訂單明細的價格表。
  const savedTotal = [o.total, o.amount, o.totalAmount].map(Number).find(v => Number.isFinite(v) && v > 0);
  const { total } = getOrderAmounts(o);
  const hasValidExtra = !o.extraStrawberry || Number(o.extraStrawberryPrice) > 0;
  const unknownExtras = ["otherAddons", "extrasText", "addOnsText", "addonsText"].some(k => String(o[k] || "").trim() && String(o[k]).trim() !== "無");
  const estimatedTotal = !unknownExtras && hasValidExtra && Number.isFinite(total) && total > 0 ? total : null;
  const amount = savedTotal ?? estimatedTotal;
  const amountLabel = o.status === "待付款" ? "待收金額" : "訂單總額";
  const amountText = amount === null ? "請核對原訂單" : `NT$${amount.toLocaleString("zh-TW")}`;
  const amountNote = savedTotal === undefined && amount !== null ? '<div class="amount-note">依現行售價，請核對原訂單</div>' : "";
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"/><title>初甜趣 訂單 ${esc(o.orderId || "")}</title>
<style>
/* 紙捲長度由印表機驅動程式決定；請在列印視窗選 80mm 感熱紙、直式、100%。 */
@page{size:auto;margin:2mm}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#f3f3f3;color:#000;font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif}
.toolbar{padding:12px;text-align:center}.toolbar button{padding:9px 22px;background:#302b28;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:16px}
.toolbar p{font-size:13px;margin:8px 12px;color:#333}
.paper{width:80mm;max-width:100%;margin:12px auto;background:#fff;padding:4mm;border:1px solid #ddd}
.brand{text-align:center;border-bottom:2px solid #000;padding-bottom:3mm}.brand strong{display:block;font-size:25px;line-height:1.2;font-weight:800}.brand .en{font-size:11px;letter-spacing:1px;margin-top:2px}.id{font-size:13px;margin-top:5px;overflow-wrap:anywhere}
section{padding:3mm 0;border-bottom:1px solid #000}.small{font-size:15px;font-weight:700;margin-bottom:3px}.pickup{text-align:center;break-inside:avoid;page-break-inside:avoid}.date{font-size:24px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}.time{font-size:34px;font-weight:900;line-height:1.2;margin-top:3px}
.contact{text-align:center;break-inside:avoid;page-break-inside:avoid}.digits{font-size:42px;line-height:1.1;font-weight:900;letter-spacing:2px;margin:2px 0 6px}.contactline{font-size:18px;font-weight:700;line-height:1.5;overflow-wrap:anywhere}
.product{font-size:24px;font-weight:800;line-height:1.3;margin-bottom:3mm;overflow-wrap:anywhere;break-after:avoid}.info{font-size:18px;line-height:1.45;margin:2mm 0;white-space:pre-wrap;overflow-wrap:anywhere}.info b{font-weight:800}.foot{padding-top:3mm;font-size:16px;font-weight:700;line-height:1.5;overflow-wrap:anywhere;break-inside:avoid;page-break-inside:avoid}
.payment-summary{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:2mm;margin-top:2mm;align-items:start;break-inside:avoid;page-break-inside:avoid}.payment-summary>div{min-width:0}.payment-status{text-align:right}.amount{font-size:30px;font-weight:900;line-height:1.2;margin:2mm 0 1mm;overflow-wrap:anywhere}.amount-label{font-size:16px;font-weight:800}.amount-note{font-size:13px;font-weight:400;line-height:1.3}
@media print{html,body{background:#fff;color:#000}.toolbar{display:none!important}.paper{margin:0 auto;width:72mm;max-width:100%;border:0;padding:0;box-shadow:none} }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">列印／另存 PDF</button><p>請選 80mm 紙捲、直式、比例 100%，關閉頁首及頁尾。</p></div>
<main class="paper">
<header class="brand"><strong>初甜趣｜訂單</strong><div class="en">HANDMADE DESSERT</div><div class="id">${show(o.orderId)}</div></header>
<section class="pickup"><div class="small">取貨日期／時間</div><div class="date">${pickup}</div><div class="time">${show(o.pickupTime)}</div></section>
<section class="contact"><div class="small">手機末四碼</div><div class="digits">${esc(lastFour)}</div><div class="contactline">${lineName ? `LINE 名稱：${esc(lineName)}` : `訂購人：${show(o.name)}`}</div><div class="contactline">電話：${show(phone)}</div></section>
<section><div class="small">蛋糕名稱／尺寸</div><div class="product">${show(o.product)} ${show(o.size)}</div><div class="info"><b>蛋糕體：</b>${show(o.cakeBody)}</div><div class="info"><b>內餡：</b>${show(o.filling || o.fillings || o.fillingText || "依商品原配方")}</div><div class="info"><b>加購：</b>${extras.length ? esc(extras.join("、")) : "無"}</div><div class="info"><b>備註：</b>${show(o.note || "無")}</div></section>
<footer class="foot"><div>付款方式：${show(o.paymentLabel || "—")}</div><div class="payment-summary"><div><div class="amount-label">${amountLabel}</div><div class="amount">${esc(amountText)}</div></div><div class="payment-status"><div class="amount-label">付款狀態</div><div class="amount">${show(o.status)}</div></div></div>${amountNote}</footer>
</main></body></html>`;
}

export function openOrderPrint(order, onPrintFinished) {
  // 必須在使用者點擊事件內開新視窗，以避免瀏覽器阻擋彈出視窗。
  const popup = window.open("", "_blank");
  if (!popup) { window.alert("瀏覽器封鎖了列印視窗，請允許此網站開啟彈出視窗後重試。"); return false; }
  popup.document.open();
  popup.document.write(buildOrderPrintHtml(order));
  popup.document.close();
  if (typeof onPrintFinished === "function") {
    let done = false, timer;
    const notify = () => {
      if (done) return;
      done = true;
      if (timer) window.clearInterval(timer);
      onPrintFinished();
      try { window.focus(); } catch {}
    };
    // afterprint 只代表關閉列印對話框（含取消），不能當成實體列印成功。
    popup.addEventListener("afterprint", notify);
    const back = popup.document.createElement("button");
    back.type = "button";
    back.textContent = "返回後台確認紙本";
    back.style.marginLeft = "8px";
    back.onclick = () => { notify(); popup.close(); };
    popup.document.querySelector(".toolbar")?.appendChild(back);
    timer = window.setInterval(() => { if (popup.closed) notify(); }, 400);
  }
  return true;
}
