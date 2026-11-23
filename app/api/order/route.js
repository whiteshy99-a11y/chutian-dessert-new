import { NextResponse } from "next/server";
import { nextOrderId, saveOrder, findOrderByRequestId, redis } from "../../../lib/orders";
import productPrices from "../../../lib/product-prices.json";
import { orderLineDetails } from "../../../lib/order-line-message";

function clean(value) {
  return String(value || "").replace(/\s+/g, "").trim();
}

async function getLineAdminUserId() {
  const direct = clean(process.env.LINE_ADMIN_USER_ID);
  if (direct) return direct;
  try {
    const result = await redis(["get", "chutian:line-admin-user-id"]);
    return String(result?.result || "").trim();
  } catch {
    return "";
  }
}

async function pushAdminLine({ token, to, text }) {
  if (!token || !to) {
    return {
      sent: false,
      reason: !token
        ? "LINE_CHANNEL_ACCESS_TOKEN 尚未設定"
        : "LINE_ADMIN_USER_ID 尚未設定",
    };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to,
        messages: [{ type: "text", text }],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error("LINE admin push failed", response.status, detail);
      return { sent: false, reason: `LINE API ${response.status}` };
    }

    return { sent: true, reason: "" };
  } catch (error) {
    console.error("LINE admin push error", error);
    return { sent: false, reason: "LINE API 連線失敗" };
  }
}

export async function POST(req) {
  try {
    const data = await req.json();
    const required = ["date", "product", "size", "pickupTime", "name", "phone"];

    for (const key of required) {
      if (!String(data[key] || "").trim()) {
        return NextResponse.json(
          { error: "請完整填寫所有必填欄位。" },
          { status: 400 },
        );
      }
    }

    const now = new Date();
    const taipeiParts = Object.fromEntries(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false, hourCycle: "h23",
      }).formatToParts(now).filter(part => part.type !== "literal").map(part => [part.type, part.value]),
    );
    const taipeiToday = `${taipeiParts.year}-${taipeiParts.month}-${taipeiParts.day}`;
    const tomorrowDate = new Date(`${taipeiToday}T00:00:00+08:00`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const taipeiTomorrow = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(tomorrowDate);
    const requestedDate = String(data.date || "").trim();

    if (requestedDate === taipeiToday) {
      return NextResponse.json({ error: "當日訂單視為急單，請先洽官方 LINE 詢問，確認可接單後再由店家協助。" }, { status: 400 });
    }
    if (Number(taipeiParts.hour) >= 20 && requestedDate === taipeiTomorrow) {
      return NextResponse.json({ error: "每日晚上 8:00 後，隔日訂單視為急單，請先洽官方 LINE 詢問。" }, { status: 400 });
    }

    // 與官網商品尺寸／價格一致；已下架的草莓花園不可再送單。
    const productName = String(data.product || "").trim();
    const productSize = String(data.size || "").trim();
    if (!productPrices[productName] || !Object.prototype.hasOwnProperty.call(productPrices[productName], productSize)) {
      return NextResponse.json({ error: "商品或尺寸已變更，請重新選擇訂購品項。" }, { status: 400 });
    }

    if (String(data.product || "").includes("夏日芒果")) {
      return NextResponse.json({ error: "夏日芒果為季節限定，目前暫停訂購。" }, { status: 400 });
    }

    const pickupTime = String(data.pickupTime || "").trim();
    const allowedPickupTimes = new Set(Array.from({ length: 13 }, (_, i) => {
      const total = 14 * 60 + i * 30;
      return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
    }));
    if (!allowedPickupTimes.has(pickupTime)) {
      return NextResponse.json({ error: "取貨時間僅開放 14:00～20:00。" }, { status: 400 });
    }

    const cakeBodyOptions = ["原味戚風蛋糕", "巧克力戚風蛋糕", "焙茶戚風蛋糕"];
    const cakeBody = String(data.cakeBody || "").trim();
    const noCakeBodyChoice = ["水果焦香巴斯克（水果依季節搭配）", "老奶奶檸檬糖霜蛋糕"].includes(String(data.product || "").trim());
    if (!noCakeBodyChoice && !cakeBodyOptions.includes(cakeBody)) {
      return NextResponse.json({ error: "請選擇有效的蛋糕體口味。" }, { status: 400 });
    }
    const extraStrawberry = data.extraStrawberry === true && ["草莓香緹", "二次元蛋糕"].includes(data.product);
    const extraPrice = extraStrawberry ? ({ "4 吋":50, "6 吋":100, "8 吋":150 }[String(data.size).trim()] || 0) : 0;
    if (data.extraStrawberry === true && !extraPrice) {
      return NextResponse.json({ error: "新鮮草莓內餡加購僅適用草莓香緹、二次元蛋糕的指定尺寸。" }, { status: 400 });
    }

    // 由同一張表單產生並重用的識別碼；遇到網路重試不會重複開單。
    // 相容部署期間可能仍使用舊版前端的訪客。
    // 舊版請求仍可下單，但沒有跨重送的去重能力。
    const requestId = String(data.requestId || crypto.randomUUID()).trim();
    if (!/^[a-zA-Z0-9-]{16,80}$/.test(requestId)) {
      return NextResponse.json({ error: "請重新整理網頁後再送出訂單。" }, { status: 400 });
    }
    const orderId = await nextOrderId();
    const paymentLabel = "銀行轉帳匯款";
    const order = {
      orderId,
      date: String(data.date).trim(),
      pickupTime: String(data.pickupTime).trim(),
      product: String(data.product).trim(),
      size: String(data.size).trim(),
      cakeBody,
      extraStrawberry,
      extraStrawberryPrice: extraPrice,
      occasion: String(data.occasion || "").trim(),
      paymentMethod: "bank",
      paymentLabel,
      name: String(data.name).trim(),
      phone: String(data.phone).trim(),
      lineName: String(data.lineName || "").trim(),
      note: String(data.note || "").trim(),
      status: "待付款",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 單一 Redis EVAL 原子寫入，避免「資料已存但清單未存」的半套訂單。
    // Redis 已寫入但網路回應遺失時，使用 requestId 查回原單，不重複建立。
    let saved;
    try {
      saved = await saveOrder(order, requestId);
    } catch (error) {
      console.error("Order atomic storage error", error);
      try {
        const recoveredId = await findOrderByRequestId(requestId);
        if (recoveredId) saved = { orderId: recoveredId, created: false };
      } catch (recoveryError) {
        console.error("Order recovery lookup error", recoveryError);
      }
    }
    if (!saved) {
      return NextResponse.json(
        { error: "無法確認訂單是否寫入，請先聯絡店家核對，避免重複下單。" },
        { status: 503 },
      );
    }
    // 重送時直接返回同一筆訂單編號，不再次觸發 LINE 推播。
    if (!saved.created) {
      return NextResponse.json({
        ok: true, orderId: saved.orderId, status: "待付款",
        savedToBackend: true, lineNotified: false,
        warning: "已找到先前送出的相同訂單，沒有重複建立；請以後台訂單及 LINE 紀錄核對通知。",
      });
    }

    const token = clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
    const to = await getLineAdminUserId();
    const text = [
      "🎂 初甜趣｜網站新訂單",
      "────────────",
      `訂單編號：${saved.orderId}`,
      orderLineDetails(order),
      "────────────",
      "狀態：🟡 待付款",
      "訂單不設匯款期限，也不會自動取消。",
      "✅ 已寫入網站訂單後台",
    ].join("\n");

    const lineNotification = await pushAdminLine({ token, to, text });

    return NextResponse.json({
      ok: true,
      orderId: saved.orderId,
      status: "待付款",
      savedToBackend: true,
      lineNotified: lineNotification.sent,
      warning: lineNotification.sent ? "" : "訂單已儲存至網站後台，但店家 LINE 通知未送達。",
    });
  } catch (error) {
    console.error("Order API error", error);
    return NextResponse.json(
      { error: "訂單送出失敗，請稍後再試或直接電話聯絡店家。" },
      { status: 500 },
    );
  }
}
