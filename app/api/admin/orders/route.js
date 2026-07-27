import { NextResponse } from "next/server";
import { getOrders } from "../../../../lib/orders";

export async function POST(req) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "後台密碼錯誤。" }, { status: 401 });
  }
  try {
    return NextResponse.json({ orders: await getOrders() });
  } catch {
    return NextResponse.json({ error: "訂單讀取失敗，請確認 Upstash Redis 已完成設定。" }, { status: 500 });
  }
}
