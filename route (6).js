import { NextResponse } from "next/server";
import { deleteCancelledOrder } from "../../../../lib/orders";
export async function POST(req) {
  try {
    const {password,orderId,confirmation}=await req.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({error:"後台密碼錯誤。"},{status:401});
    if (!/^CT\d{12}$/.test(String(orderId||"")) || confirmation!==orderId) return NextResponse.json({error:"請確認要刪除的訂單編號。"},{status:400});
    return NextResponse.json(await deleteCancelledOrder(orderId));
  } catch(e) { return NextResponse.json({error:e.message||"刪除失敗。"},{status:500}); }
}
