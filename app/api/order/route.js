import { NextResponse } from "next/server";
import { nextOrderId, saveOrder } from "../../../lib/orders";

function clean(value){return String(value || "").replace(/\s+/g, "").trim()}
async function getLineAdminUserId(){
  const direct = clean(process.env.LINE_ADMIN_USER_ID);
  if (direct) return direct;
  const url = String(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || "").trim().replace(/\/+$/, "");
  const redisToken = String(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || "").trim();
  if (!url || !redisToken) return "";
  try { const r=await fetch(`${url}/get/${encodeURIComponent("chutian:line-admin-user-id")}`,{headers:{Authorization:`Bearer ${redisToken}`},cache:"no-store"}); const j=await r.json(); return String(j?.result||"").trim(); } catch { return ""; }
}

export async function POST(req) {
  try {
    const data = await req.json();
    for (const key of ["date","product","size","pickupTime","name","phone"]) if (!String(data[key]||"").trim()) return NextResponse.json({error:"請完整填寫所有必填欄位。"},{status:400});
    const token=clean(process.env.LINE_CHANNEL_ACCESS_TOKEN), to=await getLineAdminUserId();
    const orderId=await nextOrderId();
    const paymentLabel="銀行轉帳匯款";
    const order={orderId,date:String(data.date).trim(),pickupTime:String(data.pickupTime).trim(),product:String(data.product).trim(),size:String(data.size).trim(),occasion:String(data.occasion||"").trim(),paymentMethod:"bank",paymentLabel,name:String(data.name).trim(),phone:String(data.phone).trim(),lineName:String(data.lineName||"").trim(),note:String(data.note||"").trim(),status:"待付款",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    const saved=await saveOrder(order);
    if(!saved) return NextResponse.json({error:"訂單後台尚未完成設定，請稍後再試。"},{status:500});

    const text=["🎂 初甜趣｜網站新訂單","────────────",`訂單編號：${orderId}`,`取貨日期：${order.date}`,`取貨時間：${order.pickupTime}`,`品項：${order.product}`,`尺寸：${order.size}`,`用途：${order.occasion||"未填"}`,`付款方式：${paymentLabel}`,`姓名：${order.name}`,`電話：${order.phone}`,`LINE 名稱：${order.lineName||"未填"}`,`備註：${order.note||"無"}`,"────────────","狀態：🟡 待付款","訂單不設匯款期限，也不會自動取消。"].join("\n");
    if(token&&to){
      const lineResponse=await fetch("https://api.line.me/v2/bot/message/push",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({to,messages:[{type:"text",text}]}),cache:"no-store"});
      if(!lineResponse.ok) console.error("LINE admin push failed",lineResponse.status,await lineResponse.text());
    } else {
      console.warn("Order saved, but LINE admin notification is not configured yet.");
    }
    return NextResponse.json({ok:true,orderId,savedToBackend:true});
  } catch(error){console.error("Order API error",error);return NextResponse.json({error:"訂單送出失敗，請稍後再試或直接電話聯絡店家。"},{status:500});}
}
