import { NextResponse } from "next/server";
import { getOrders, redis } from "../../../../lib/orders";
import { PRINT_STATE_KEY } from "../../../../lib/order-print-state";

export async function POST(req) {
  const { password } = await req.json();
  if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "後台密碼錯誤。" }, { status: 401 });
  }
  try {
    const orders = await getOrders();
    const records = new Map();
    // 分批讀取，避免大量訂單造成單次 Redis 指令過大；讀取失敗不得誤顯示未列印。
    for (let i = 0; i < orders.length; i += 100) {
      const ids = orders.slice(i, i + 100).map(o => o.orderId);
      const result = await redis(["hmget", PRINT_STATE_KEY, ...ids]);
      if (!Array.isArray(result?.result) || result.result.length !== ids.length) throw new Error("列印紀錄讀取失敗");
      result.result.forEach((raw, idx) => { if (raw != null) records.set(ids[idx], typeof raw === "string" ? JSON.parse(raw) : raw); });
    }
    return NextResponse.json({ orders: orders.map(o => ({...o, printRecord:records.get(o.orderId) || null})) });
  } catch {
    return NextResponse.json({ error: "訂單讀取失敗，請確認 Upstash Redis 已完成設定。" }, { status: 500 });
  }
}
