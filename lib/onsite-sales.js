import { redis } from "./orders";

const LEGACY_KEY = "chutian:onsite-sales:v1";
const PRODUCTS_KEY = "chutian:onsite-products:v2";
const MONTH_KEY_PREFIX = "chutian:onsite-sales:v2:";

const emptyProducts = [];
const emptyMonth = { days: {} };

function monthKey(month) {
  return `${MONTH_KEY_PREFIX}${month}`;
}

function validMonth(month) {
  return /^\d{4}-\d{2}$/.test(String(month || ""));
}

function validDate(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || ""));
}

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

function normalizeQuantities(quantities = {}, products = []) {
  const validIds = new Set(products.map((item) => item.id));
  const clean = {};
  for (const [id, value] of Object.entries(quantities || {})) {
    if (!validIds.has(id)) continue;
    const quantity = Math.max(0, Math.floor(Number(value || 0)));
    if (quantity > 0) clean[id] = quantity;
  }
  return clean;
}

function normalizePrices(prices = {}, products = []) {
  const productMap = new Map(products.map((item) => [item.id, item]));
  const clean = {};
  for (const [id, product] of productMap.entries()) {
    const price = Number(prices?.[id]);
    clean[id] = Number.isFinite(price) && price >= 0 ? price : Number(product.price || 0);
  }
  return clean;
}

function normalizeExtras(extras = []) {
  return (Array.isArray(extras) ? extras : [])
    .map((item, index) => ({
      id: String(item?.id || `extra-${Date.now()}-${index}`),
      name: String(item?.name || "").trim(),
      price: Math.max(0, Number(item?.price || 0)),
      quantity: Math.max(0, Math.floor(Number(item?.quantity || 0))),
    }))
    .filter((item) => item.name && item.price > 0 && item.quantity > 0);
}

function normalizeMonthData(data = {}, products = []) {
  const days = {};
  const rawDays = data?.days && typeof data.days === "object" ? data.days : {};
  for (const [date, raw] of Object.entries(rawDays)) {
    if (!validDate(date)) continue;
    const quantities = normalizeQuantities(raw?.quantities || {}, products);
    const prices = normalizePrices(raw?.prices || {}, products);
    const extras = normalizeExtras(raw?.extras || []);
    if (Object.keys(quantities).length || extras.length) days[date] = { quantities, prices, extras };
  }
  return { days };
}

async function readJson(key) {
  const result = await redis(["get", key]);
  if (!result?.result) return null;
  try { return JSON.parse(result.result); } catch { return null; }
}

async function readLegacy() {
  const saved = await readJson(LEGACY_KEY);
  if (!saved || typeof saved !== "object") return { products: [], daily: {} };
  const products = normalizeProducts(saved.products || []);
  return { products, daily: saved.daily && typeof saved.daily === "object" ? saved.daily : {} };
}

export async function getOnsiteProducts() {
  const saved = await readJson(PRODUCTS_KEY);
  if (Array.isArray(saved)) return normalizeProducts(saved);
  const legacy = await readLegacy();
  return legacy.products || emptyProducts;
}

export async function getOnsiteMonth(month, providedProducts) {
  if (!validMonth(month)) throw new Error("月份格式不正確。");
  const products = providedProducts || await getOnsiteProducts();
  const saved = await readJson(monthKey(month));
  if (saved) return normalizeMonthData(saved, products);

  // 舊版資料仍可直接讀取；第一次儲存該月份時會自動轉成按月保存的新格式。
  const legacy = await readLegacy();
  const days = {};
  for (const [date, counts] of Object.entries(legacy.daily || {})) {
    if (!date.startsWith(`${month}-`) || !validDate(date)) continue;
    const quantities = normalizeQuantities(counts, products);
    if (!Object.keys(quantities).length) continue;
    days[date] = { quantities, prices: normalizePrices({}, products), extras: [] };
  }
  return { days };
}

export async function saveOnsiteProducts(products) {
  const normalized = normalizeProducts(products);
  const saved = await redis(["set", PRODUCTS_KEY, JSON.stringify(normalized)]);
  if (!saved) throw new Error("尚未設定 Redis，因此無法儲存現場商品資料。");
  return normalized;
}

export async function saveDailyOnsiteSales(date, quantities, extras = []) {
  if (!validDate(date)) throw new Error("日期格式不正確。");
  const month = date.slice(0, 7);
  const products = await getOnsiteProducts();
  const current = await getOnsiteMonth(month, products);
  const cleanQuantities = normalizeQuantities(quantities, products);
  const prices = normalizePrices({}, products);
  const cleanExtras = normalizeExtras(extras);
  const days = { ...(current.days || {}) };

  if (Object.keys(cleanQuantities).length || cleanExtras.length) {
    days[date] = { quantities: cleanQuantities, prices, extras: cleanExtras };
  } else {
    delete days[date];
  }

  const normalized = { days };
  const saved = await redis(["set", monthKey(month), JSON.stringify(normalized)]);
  if (!saved) throw new Error("尚未設定 Redis，因此無法儲存現場銷售資料。");
  return normalized;
}

export function summarizeOnsiteMonth(data, products = []) {
  const productMap = new Map((products || []).map((item) => [item.id, item]));
  const byProduct = {};
  let fixedRevenue = 0;
  let fixedQuantity = 0;
  let extraRevenue = 0;
  let extraQuantity = 0;
  const days = [];

  for (const date of Object.keys(data?.days || {}).sort()) {
    const day = data.days[date] || {};
    const fixedLines = [];
    const extraLines = [];
    let dayFixedRevenue = 0;
    let dayExtraRevenue = 0;

    for (const [id, rawQty] of Object.entries(day.quantities || {})) {
      const product = productMap.get(id);
      if (!product) continue;
      const quantity = Math.max(0, Math.floor(Number(rawQty || 0)));
      if (!quantity) continue;
      const unitPrice = Math.max(0, Number(day.prices?.[id] ?? product.price ?? 0));
      const subtotal = quantity * unitPrice;
      fixedQuantity += quantity;
      fixedRevenue += subtotal;
      dayFixedRevenue += subtotal;
      fixedLines.push({ id, name: product.name, quantity, unitPrice, subtotal });
      if (!byProduct[id]) byProduct[id] = { id, name: product.name, quantity: 0, revenue: 0 };
      byProduct[id].quantity += quantity;
      byProduct[id].revenue += subtotal;
    }

    for (const item of normalizeExtras(day.extras || [])) {
      const subtotal = item.quantity * item.price;
      extraQuantity += item.quantity;
      extraRevenue += subtotal;
      dayExtraRevenue += subtotal;
      extraLines.push({ ...item, unitPrice: item.price, subtotal });
    }

    if (fixedLines.length || extraLines.length) {
      days.push({
        date,
        fixedLines,
        extraLines,
        fixedRevenue: dayFixedRevenue,
        extraRevenue: dayExtraRevenue,
        revenue: dayFixedRevenue + dayExtraRevenue,
      });
    }
  }

  return {
    revenue: fixedRevenue + extraRevenue,
    quantity: fixedQuantity + extraQuantity,
    fixedRevenue,
    fixedQuantity,
    extraRevenue,
    extraQuantity,
    byProduct: Object.values(byProduct),
    days,
  };
}

export function clientMonthData(data) {
  const daily = {};
  const extrasByDate = {};
  for (const [date, day] of Object.entries(data?.days || {})) {
    daily[date] = day?.quantities || {};
    extrasByDate[date] = day?.extras || [];
  }
  return { daily, extrasByDate };
}
