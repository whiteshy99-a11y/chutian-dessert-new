import { NextResponse } from "next/server";
import { updateOrderStatus } from "../../../../lib/orders";

export async function POST(req) {
  const { password, orderId, status } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "後台密碼錯誤。" }, { status: 401 });
  }
  try {
    return NextResponse.json({ order: await updateOrderStatus(orderId, status) });
  } catch (e) {
    return NextResponse.json({ error: e.message || "更新失敗。" }, { status: 500 });
  }
}
