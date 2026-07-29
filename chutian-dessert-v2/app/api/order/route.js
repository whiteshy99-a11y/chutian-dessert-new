import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const data = await req.json();
    const required = ["date","product","size","pickupTime","name","phone"];
    for (const key of required) {
      if (!String(data[key] || "").trim()) {
        return NextResponse.json({error:"請完整填寫必填欄位。"}, {status:400});
      }
    }

    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    const to = process.env.LINE_ADMIN_USER_ID;
    if (!token || !to) {
      return NextResponse.json({error:"網站尚未完成 LINE 金鑰設定，請聯絡店家。"}, {status:500});
    }

    const text = [
      "🎂 初甜趣｜網站新訂單",
      "────────────",
      `取貨日期：${data.date}`,
      `取貨時間：${data.pickupTime}`,
      `品項：${data.product}`,
      `尺寸：${data.size}`,
      `姓名：${data.name}`,
      `電話：${data.phone}`,
      `LINE 名稱：${data.lineName || "未填"}`,
      `備註：${data.note || "無"}`,
      "────────────",
      "請盡快與客人確認，確認後訂單才正式成立。"
    ].join("\n");

    const line = await fetch("https://api.line.me/v2/bot/message/push", {
      method:"POST",
      headers:{
        "content-type":"application/json",
        "authorization":`Bearer ${token}`
      },
      body:JSON.stringify({to,messages:[{type:"text",text}]})
    });

    if (!line.ok) {
      const detail = await line.text();
      console.error("LINE error", detail);
      return NextResponse.json({error:"訂單已收到，但 LINE 通知設定尚未成功，請直接電話聯絡店家。"}, {status:502});
    }
    return NextResponse.json({ok:true});
  } catch (e) {
    console.error(e);
    return NextResponse.json({error:"系統暫時忙碌，請稍後再試。"}, {status:500});
  }
}
