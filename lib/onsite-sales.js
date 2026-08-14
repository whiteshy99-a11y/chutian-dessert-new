import { redis } from "./orders";

const SALES_KEY = "chutian:onsite-sales:v1";

const fallback = {
  products: [],
  daily: {},
};

function normalizeProducts(products = []) {
  return products
    .map((item, index) => ({
      id: String(item?.id || `onsite-${Date.now()}-${index}`),
      name: String(item?.name || "").trim(),
      price: Math.max(0, Number(item?.price || 0)),
      active: item?.active !== false,
    }))
    .filter((item) => item.name);
}

function normalizeDaily(daily = {}, products = []) {
  const validIds = new Set(products.map((item) => item.id));
  const next = {};
  for (const [date, counts] of Object.entries(daily || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !counts || typeof counts !== "object") continue;
    const clean = {};
    for (const [id, value] of Object.entries(counts)) {
      if (!validIds.has(id)) continue;
      const quantity = Math.max(0, Math.floor(Number(value || 0)));
      if (quantity > 0) clean[id] = quantity;
    }
    next[date] = clean;
  }
  return next;
}

export async function getOnsiteSales() {
  const result = await redis(["get", SALES_KEY]);
  if (!result?.result) return fallback;
  try {
    const saved = JSON.parse(result.result);
    const products = normalizeProducts(saved.products);
    return { products, daily: normalizeDaily(saved.daily, products) };
  } catch {
    return fallback;
  }
}

export async function saveOnsiteSales(data) {
  const products = normalizeProducts(data?.products);
  const daily = normalizeDaily(data?.daily, products);
  const normalized = { products, daily };
  const saved = await redis(["set", SALES_KEY, JSON.stringify(normalized)]);
  if (!saved) throw new Error("尚未設定 Redis，因此無法儲存現場銷售資料。");
  return normalized;
}

export async function saveOnsiteProducts(products) {
  const current = await getOnsiteSales();
  return saveOnsiteSales({ ...current, products });
}

export async function saveDailyOnsiteSales(date, quantities) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) throw new Error("日期格式不正確。");
  const current = await getOnsiteSales();
  const daily = { ...current.daily, [date]: quantities || {} };
  return saveOnsiteSales({ ...current, daily });
}

export function summarizeOnsiteMonth(data, month) {
  const prefix = `${month}-`;
  const productMap = new Map((data?.products || []).map((item) => [item.id, item]));
  let revenue = 0;
  let quantity = 0;
  const byProduct = {};
  for (const [date, counts] of Object.entries(data?.daily || {})) {
    if (!date.startsWith(prefix)) continue;
    for (const [id, rawQty] of Object.entries(counts || {})) {
      const product = productMap.get(id);
      if (!product) continue;
      const qty = Math.max(0, Number(rawQty || 0));
      const subtotal = qty * Number(product.price || 0);
      quantity += qty;
      revenue += subtotal;
      if (!byProduct[id]) byProduct[id] = { ...product, quantity: 0, revenue: 0 };
      byProduct[id].quantity += qty;
      byProduct[id].revenue += subtotal;
    }
  }
  return { revenue, quantity, byProduct: Object.values(byProduct) };
}
