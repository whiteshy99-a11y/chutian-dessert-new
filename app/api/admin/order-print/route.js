import { NextResponse } from "next/server";
import { getOrder, redis } from "../../../../lib/orders";
import { PRINT_STATE_KEY } from "../../../../lib/order-print-state";

// 只寫獨立 Redis hash，不覆寫訂單、不發送 LINE、不變更付款狀態。
export async function POST(req) {
  try {
    const { password, orderId, printed, expectedStatus } = await req.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) return NextResponse.json({error:"後台密碼錯誤。"},{status:401});
    if (!/^CT\d{12,14}$/.test(String(orderId || "")) || typeof printed !== "boolean") return NextResponse.json({error:"資料格式不正確。"},{status:400});
    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({error:"找不到訂單，請重新讀取。"},{status:404});
    // 列印確認獨立於付款狀態；保留列印時的狀態供追溯，不要求重印。
    if (printed && !["待付款", "已付款", "已取消"].includes(expectedStatus)) return NextResponse.json({error:"列印時的訂單狀態不正確。"},{status:400});
    const record = {printed, status: printed ? expectedStatus : null, printedAt: printed ? new Date().toISOString() : null};
    const result = await redis(["hset", PRINT_STATE_KEY, orderId, JSON.stringify(record)]);
    if (typeof result?.result !== "number") throw new Error("列印紀錄未能儲存，請重試。");
    return NextResponse.json({orderId, printRecord:record});
  } catch(e) { return NextResponse.json({error:e.message || "列印狀態更新失敗。"},{status:500}); }
}
