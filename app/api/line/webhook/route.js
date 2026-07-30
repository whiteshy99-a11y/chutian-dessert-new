import { NextResponse } from "next/server";
import crypto from "crypto";
import { bindLineUser, getBoundOrderId, getOrder, redis } from "../../../../lib/orders";

function clean(value){return String(value||"").trim().replace(/^['"]|['"]$/g,"").replace(/\/+$/,"")}
function validSignature(raw,signature){const secret=clean(process.env.LINE_CHANNEL_SECRET);if(!secret||!signature)return false;const digest=crypto.createHmac("sha256",secret).update(raw).digest("base64");try{return crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(signature))}catch{return false}}
async function send(endpoint,payload){const token=clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);if(!token)return false;const r=await fetch(`https://api.line.me/v2/bot/message/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});return r.ok}
async function reply(replyToken,text){if(replyToken)await send("reply",{replyToken,messages:[{type:"text",text}]})}
async function push(to,text){if(to)await send("push",{to,messages:[{type:"text",text}]})}
async function adminId(){const direct=clean(process.env.LINE_ADMIN_USER_ID);if(direct)return direct;const result=await redis(["get","chutian:line-admin-user-id"]);return String(result?.result||"").trim()}

export async function GET(){return NextResponse.json({ok:true,message:"LINE webhook is ready"})}
export async function POST(req){
  const raw=await req.text();
  if(!validSignature(raw,req.headers.get("x-line-signature")))return NextResponse.json({error:"invalid signature"},{status:401});
  const body=JSON.parse(raw||"{}");
  for(const event of body.events||[]){
    const userId=event.source?.userId, type=event.message?.type, text=type==="text"?String(event.message.text).trim():"";
    if(text==="綁定店家"&&userId){const saved=await redis(["set","chutian:line-admin-user-id",userId]);await reply(event.replyToken,saved?"初甜趣店家 LINE 已綁定成功。之後網站有新訂單，會傳送通知到這個聊天室。":"已收到綁定指令，但網站尚未設定 Upstash Redis。");continue;}
    const match=text.toUpperCase().match(/CT\d{12}/);
    if(match&&userId){
      try{const order=await bindLineUser(match[0],userId);await reply(event.replyToken,`已成功配對訂單 ${order.orderId}。\n匯款完成後，請直接在這裡上傳付款截圖；店家確認款項後，LINE 會自動通知您訂單成立。\n本訂單沒有匯款期限，也不會自動取消。`);}catch{await reply(event.replyToken,"找不到這筆訂單，請確認訂單編號是否輸入正確。");}
      continue;
    }
    if(type==="image"&&userId){
      const orderId=await getBoundOrderId(userId), order=orderId?await getOrder(orderId):null;
      if(!order){await reply(event.replyToken,"請先傳送您的訂單編號（例如 CT202607300001），再上傳付款截圖。");continue;}
      await reply(event.replyToken,`已收到訂單 ${order.orderId} 的付款截圖，將由店家進行核對。確認後會由 LINE 自動通知您。`);
      await push(await adminId(),`💰 客人已上傳付款截圖\n訂單編號：${order.orderId}\n姓名：${order.name}\n取貨日期：${order.date} ${order.pickupTime}\n請至 LINE 聊天室查看截圖，核對後到網站後台按「確認收到款項」。`);
    }
  }
  return NextResponse.json({ok:true});
}
