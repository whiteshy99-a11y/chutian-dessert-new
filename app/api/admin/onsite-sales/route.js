import { NextResponse } from "next/server";
import { getOrders } from "../../../../lib/orders";
import {
  getOnsiteSales,
  saveDailyOnsiteSales,
  saveOnsiteProducts,
  summarizeOnsiteMonth,
} from "../../../../lib/onsite-sales";
import { summarizeWebsiteMonth } from "../../../../lib/order-revenue";

function authorized(password) {
  return Boolean(process.env.ADMIN_PASSWORD) && password === process.env.ADMIN_PASSWORD;
}

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}`;
}

async function payload(month) {
  const selectedMonth = /^\d{4}-\d{2}$/.test(String(month || "")) ? month : currentMonth();
  const [sales, orders] = await Promise.all([getOnsiteSales(), getOrders()]);
  const onsiteSummary = summarizeOnsiteMonth(sales, selectedMonth);
  const websiteSummary = summarizeWebsiteMonth(orders, selectedMonth);
  return {
    month: selectedMonth,
    products: sales.products,
    daily: sales.daily,
    onsiteSummary,
    websiteSummary,
    totalRevenue: onsiteSummary.revenue + websiteSummary.revenue,
  };
}

export async function POST(req) {
  try {
    const body = await req.json();
    if (!authorized(body.password)) {
      return NextResponse.json({ error: "後台密碼錯誤。" }, { status: 401 });
    }
    const action = String(body.action || "load");
    if (action === "saveProducts") await saveOnsiteProducts(body.products || []);
    if (action === "saveDaily") await saveDailyOnsiteSales(String(body.date || ""), body.quantities || {});
    return NextResponse.json(await payload(body.month));
  } catch (error) {
    return NextResponse.json({ error: error?.message || "現場銷售資料處理失敗。" }, { status: 500 });
  }
}
