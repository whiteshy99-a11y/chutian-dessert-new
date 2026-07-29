import { NextResponse } from "next/server";
import crypto from "crypto";

function clean(value){return String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "")}

async function redis(command){
  const url=clean(process.env.UPSTASH_REDIS_REST_URL), token=clean(process.env.UPSTASH_REDIS_REST_TOKEN);
  if(!url||!token)return null;
  const r=await fetch(`${url}/${command.map(x=>encodeURIComponent(String(x))).join("/")}`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"});
  if(!r.ok)throw new Error("Redis request failed");
  return r.json();
}

function validSignature(raw, signature){
  const secret=clean(process.env.LINE_CHANNEL_SECRET);
  if(!secret||!signature)return false;
  const digest=crypto.createHmac("sha256",secret).update(raw).digest("base64");
  try{return crypto.timingSafeEqual(Buffer.from(digest),Buffer.from(signature))}catch{return false}
}

async function reply(replyToken,text){
  const token=clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  if(!token||!replyToken)return;
  await fetch("https://api.line.me/v2/bot/message/reply",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({replyToken,messages:[{type:"text",text}]})});
}

export async function GET(){return NextResponse.json({ok:true,message:"LINE webhook is ready"})}

export async function POST(req){
  const raw=await req.text();
  if(!validSignature(raw,req.headers.get("x-line-signature")))return NextResponse.json({error:"invalid signature"},{status:401});
  const body=JSON.parse(raw||"{}");
  for(const event of body.events||[]){
    const text=event.message?.type==="text"?String(event.message.text).trim():"";
    const userId=event.source?.userId;
    if(text==="綁定店家"&&userId){
      const saved=await redis(["set","chutian:line-admin-user-id",userId]);
      if(saved) await reply(event.replyToken,"初甜趣店家 LINE 已綁定成功。之後網站有新訂單，會傳送通知到這個聊天室。")
      else await reply(event.replyToken,"已收到綁定指令，但網站尚未設定 Upstash Redis。請先完成 Vercel 環境變數設定。")
    }
  }
  return NextResponse.json({ok:true});
}
