import { NextResponse } from "next/server";
import { setPaperRegistered } from "../../../../lib/orders";
export async function POST(req) {
  try {
    const {password,orderId,registered}=await req.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({error:"後台密碼錯誤。"},{status:401});
    if (!/^CT\d{12}$/.test(String(orderId||"")) || typeof registered!=="boolean") return NextResponse.json({error:"資料格式不正確。"},{status:400});
    return NextResponse.json({order:await setPaperRegistered(orderId,registered)});
  } catch(e) { return NextResponse.json({error:e.message||"更新失敗。"},{status:500}); }
}
