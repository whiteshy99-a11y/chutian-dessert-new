const fallback = {
  closedDates: ["2026-08-19"],
  limitedDates: [],
  products: [
    { id:"strawberry", name:"草莓鮮奶油蛋糕", desc:"當季草莓・香草布丁", price:"價格依尺寸與裝飾確認" },
    { id:"chocolate", name:"生巧克力蛋糕", desc:"法芙娜可可・生巧克力", price:"價格依尺寸與裝飾確認" },
    { id:"tiramisu", name:"提拉米蘇", desc:"馬斯卡彭・咖啡酒香", price:"價格依尺寸與裝飾確認" },
    { id:"earlgrey", name:"伯爵葡萄戚風", desc:"伯爵茶・新鮮綠葡萄", price:"價格依尺寸與裝飾確認" },
    { id:"basque", name:"巴斯克乳酪蛋糕", desc:"濃郁乳酪・焦香表層", price:"價格依尺寸與裝飾確認" }
  ],
  bankName: "連線商業銀行",
  bankCode: "824",
  bankAccount: "111018312187",
  bankNote: "匯款完成後，請加入 LINE 官方帳號並提供訂購人姓名與帳號後五碼。",
  lineUrl: "https://line.me/R/ti/p/@563shriq",
  serviceHours: "每日 10:00–20:00",
  announcement: "",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=高雄市鳳山區經武路353之1號",
  reviewUrl: ""
};

async function redis(command) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const r = await fetch(`${url}/${command.map(encodeURIComponent).join("/")}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  if (!r.ok) throw new Error("Redis request failed");
  return r.json();
}

export async function getSettings() {
  try {
    const r = await redis(["get", "chutian:settings"]);
    return r?.result ? { ...fallback, ...JSON.parse(r.result) } : fallback;
  } catch {
    return fallback;
  }
}

export async function saveSettings(settings) {
  const normalized = { ...fallback, ...settings };
  const r = await redis(["set", "chutian:settings", JSON.stringify(normalized)]);
  if (!r) throw new Error("尚未設定 Upstash Redis，因此無法永久儲存後台資料。");
  return normalized;
}
