// 純前端列印：不發送網路請求、不修改訂單及紙本登記狀態。
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
  for (const k of ["extrasText", "addOnsText", "addonsText"]) if (o[k]) extras.push(String(o[k]));
  const pickup = show(date);
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"/><title>初甜趣 訂單 ${esc(o.orderId || "")}</title>
<style>
@page{size:150mm 100mm;margin:5mm}
*{box-sizing:border-box}html,body{margin:0;padding:0;background:#f3f3f3;color:#161616;font-family:Arial,"Noto Sans TC","Microsoft JhengHei",sans-serif}
.toolbar{padding:12px;text-align:center}.toolbar button{padding:9px 22px;background:#302b28;color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:16px}
.paper{width:140mm;min-height:90mm;margin:14px auto;background:#fff;padding:5mm 6mm;border:1px solid #ddd}
.brand{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:13px;border-bottom:2px solid #222;padding-bottom:6px}.brand strong{font-size:20px}.id{font-size:11px;overflow-wrap:anywhere}
.top{display:grid;grid-template-columns:27% 43% 30%;gap:4px;border-bottom:1px solid #555;padding:12px 0;align-items:center}
.small{font-size:11px;color:#555;font-weight:600;margin-bottom:3px}.name{font-size:19px;font-weight:800;overflow-wrap:anywhere}.phone{font-size:17px;font-weight:700;white-space:nowrap}.last{text-align:center;border-left:1px solid #bbb}.digits{font-size:38px;line-height:1.05;font-weight:900;letter-spacing:2px}
.bottom{display:grid;grid-template-columns:62% 38%;gap:10px;padding:12px 0 8px}.product{font-size:21px;font-weight:800;margin-bottom:9px;overflow-wrap:anywhere}.info{font-size:14px;line-height:1.45;margin:5px 0;white-space:pre-wrap;overflow-wrap:anywhere}.pickup{text-align:center;border-left:1px solid #bbb;padding-left:9px}.date{font-size:28px;font-weight:900;line-height:1.2;overflow-wrap:anywhere}.time{font-size:34px;font-weight:900;line-height:1.2}
.foot{border-top:1px solid #555;display:flex;justify-content:space-between;gap:8px;padding-top:8px;font-size:12px;font-weight:700}
@media print{html,body{background:#fff}.toolbar{display:none}.paper{margin:0;width:100%;min-height:0;border:0;padding:0;box-shadow:none} }
</style></head><body>
<div class="toolbar"><button onclick="window.print()">列印／另存 PDF</button></div>
<main class="paper">
<header class="brand"><div><strong>初甜趣</strong>　HANDMADE DESSERT</div><span class="id">${show(o.orderId)}</span></header>
<section class="top"><div><div class="small">訂購人</div><div class="name">${show(o.name)}</div></div><div><div class="small">完整電話</div><div class="phone">${show(phone)}</div></div><div class="last"><div class="small">手機末四碼</div><div class="digits">${esc(lastFour)}</div></div></section>
<section class="bottom"><div><div class="small">蛋糕名稱／尺寸</div><div class="product">${show(o.product)} ${show(o.size)}</div><div class="info"><b>蛋糕體：</b>${show(o.cakeBody)}</div><div class="info"><b>內餡：</b>${show(o.filling || o.fillings || o.fillingText || "依商品原配方")}</div><div class="info"><b>加購：</b>${extras.length ? esc(extras.join("、")) : "無"}</div><div class="info"><b>備註：</b>${show(o.note || "無")}</div></div>
<div class="pickup"><div class="small">取貨日期</div><div class="date">${pickup}</div><div class="small" style="margin-top:12px">取貨時間</div><div class="time">${show(o.pickupTime)}</div></div></section>
<footer class="foot"><span>付款方式：${show(o.paymentLabel || "—")}</span><span>狀態：${show(o.status)}</span></footer>
</main></body></html>`;
}

export function openOrderPrint(order) {
  // 必須在使用者點擊事件內開新視窗，以避免瀏覽器阻擋彈出視窗。
  const popup = window.open("", "_blank");
  if (!popup) { window.alert("瀏覽器封鎖了列印視窗，請允許此網站開啟彈出視窗後重試。"); return; }
  popup.document.open();
  popup.document.write(buildOrderPrintHtml(order));
  popup.document.close();
}
