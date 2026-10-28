import { NextResponse } from "next/server";
import { updateOrderStatus } from "../../../../lib/orders";

function clean(value){return String(value||"").replace(/\s+/g,"").trim()}
async function pushLine(to,text){
  const token=clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  if(!token||!to) return {sent:false,reason:"客人尚未以訂單編號綁定 LINE"};
  const r=await fetch("https://api.line.me/v2/bot/message/push",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({to,messages:[{type:"text",text}]}),cache:"no-store"});
  return {sent:r.ok,reason:r.ok?"":await r.text()};
}

export async function POST(req){
  const {password,orderId,status}=await req.json();
  if(!process.env.ADMIN_PASSWORD||password!==process.env.ADMIN_PASSWORD)return NextResponse.json({error:"後台密碼錯誤。"},{status:401});
  try{
    const order=await updateOrderStatus(orderId,status);
    let notification={sent:false,reason:"此狀態不需通知"};
    if(status==="已付款") notification=await pushLine(order.lineUserId,`🎉 您好，已收到您的款項。\n訂單編號：${order.orderId}\n您的訂單已正式成立。\n我們將依照您預約的日期製作，謝謝您的支持 😊`);
    if(status==="已取消") notification=await pushLine(order.lineUserId,`您好，很抱歉通知您，您的訂單已取消。\n訂單編號：${order.orderId}\n如有任何疑問，歡迎透過 LINE 與我們聯繫。`);
    return NextResponse.json({order,notification});
  }catch(e){return NextResponse.json({error:e.message||"更新失敗。"},{status:500});}
}
