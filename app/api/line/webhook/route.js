import { NextResponse } from "next/server";
import crypto from "crypto";
import { bindLineUser, getBoundOrderId, getOrder, redis } from "../../../../lib/orders";
import { customerOrderLineMessage } from "../../../../lib/order-line-message";

function clean(value){return String(value||"").trim().replace(/^['"]|['"]$/g,"").replace(/\/+$/,"")}
function validSignature(raw,signature){const secret=clean(process.env.LINE_CHANNEL_SECRET);if(!secret||!signature)return false;const digest=crypto.createHmac("sha256",secret).update(raw).digest("base64");try{return crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(signature))}catch{return false}}
async function send(endpoint,payload){const token=clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);if(!token)return false;const r=await fetch(`https://api.line.me/v2/bot/message/${endpoint}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify(payload)});return r.ok}
async function reply(replyToken,text){if(replyToken)await send("reply",{replyToken,messages:[{type:"text",text}]})}
async function push(to,text){return to?await send("push",{to,messages:[{type:"text",text}]}):false}
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
      try{const existing=await getOrder(match[0]);if(!existing)throw new Error("找不到訂單");const alreadyBound=existing.lineUserId===userId;const order=await bindLineUser(match[0],userId);await reply(event.replyToken,alreadyBound?`訂單 ${order.orderId} 已配對成功。請直接上傳付款截圖，店家確認後會通知您。`:customerOrderLineMessage(order));}catch(error){console.error("LINE order binding error",error);await reply(event.replyToken,"無法配對這筆訂單，請確認訂單編號，或聯絡店家協助。");}
      continue;
    }
    if(type==="image"&&userId){
      // 一般圖片、未綁定訂單、已付款或已取消訂單均交由店家正常聊天處理。
      const orderId=await getBoundOrderId(userId), order=orderId?await getOrder(orderId):null;
      if(!order||order.lineUserId!==userId||order.status!=="待付款")continue;

      // 每筆訂單獨立去重；SET NX 是原子操作，連續或同時上傳圖片只會有一次取得資格。
      // 不修改訂單內容或 Redis 連線設定；另用一個通知標記保存已通知狀態。
      const noticeKey=`chutian:payment-image-notified:${order.orderId}`;
      const claimed=await redis(["set",noticeKey,"1","NX"]);
      if(claimed?.result!=="OK")continue;

      try{
        await reply(event.replyToken,`已收到訂單 ${order.orderId} 的圖片，將由店家核對是否為付款截圖。確認款項後會由 LINE 通知您。`);
      }catch(error){console.error("LINE payment image reply failed",error);}

      let notified=false;
      try{
        notified=await push(await adminId(),`💰 客人已上傳圖片（待核對付款）\n訂單編號：${order.orderId}\n姓名：${order.name}\n取貨日期：${order.date} ${order.pickupTime}\n請至 LINE 聊天室查看圖片，確認為付款截圖並核對款項後，再到網站後台按「確認收到款項」。`);
      }catch(error){console.error("LINE payment image push failed",error);}
      if(!notified){
        // 額度已滿或發送失敗時，不把此次視為成功；下次上傳可再次嘗試。
        await redis(["del",noticeKey]);
      }
    }
  }
  return NextResponse.json({ok:true});
}
