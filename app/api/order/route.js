import { NextResponse } from "next/server";
import { nextOrderId, saveOrder, redis } from "../../../lib/orders";

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

    const orderId = await nextOrderId();
    const paymentLabel = "銀行轉帳匯款";
    const order = {
      orderId,
      date: String(data.date).trim(),
      pickupTime: String(data.pickupTime).trim(),
      product: String(data.product).trim(),
      size: String(data.size).trim(),
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

    // 正式後台仍使用 Redis；但 Redis 尚未完成設定時，不再直接阻擋客人送單。
    // 此時會先把完整訂單推送到店家 LINE，讓店家不會漏單。
    let savedToBackend = false;
    let storageError = "";
    try {
      savedToBackend = await saveOrder(order);
      if (!savedToBackend) storageError = "Redis 尚未設定";
    } catch (error) {
      storageError = error instanceof Error ? error.message : "Redis 儲存失敗";
      console.error("Order storage error", error);
    }

    const token = clean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
    const to = await getLineAdminUserId();
    const text = [
      "🎂 初甜趣｜網站新訂單",
      "────────────",
      `訂單編號：${orderId}`,
      `取貨日期：${order.date}`,
      `取貨時間：${order.pickupTime}`,
      `品項：${order.product}`,
      `尺寸：${order.size}`,
      `用途：${order.occasion || "未填"}`,
      `付款方式：${paymentLabel}`,
      `姓名：${order.name}`,
      `電話：${order.phone}`,
      `LINE 名稱：${order.lineName || "未填"}`,
      `備註：${order.note || "無"}`,
      "────────────",
      "狀態：🟡 待付款",
      "訂單不設匯款期限，也不會自動取消。",
      savedToBackend
        ? "✅ 已寫入網站訂單後台"
        : "⚠️ 尚未寫入網站後台，請先依此 LINE 訊息保留訂單資料。",
    ].join("\n");

    const lineNotification = await pushAdminLine({ token, to, text });

    // 至少必須成功寫入後台或成功通知店家，才向客人顯示送出成功。
    if (!savedToBackend && !lineNotification.sent) {
      return NextResponse.json(
        {
          error:
            "訂單暫時無法送出。網站後台與店家 LINE 通知皆未連線，請直接聯絡店家。",
          detail: [storageError, lineNotification.reason].filter(Boolean).join("；"),
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      orderId,
      status: "待付款",
      savedToBackend,
      lineNotified: lineNotification.sent,
      warning: savedToBackend
        ? ""
        : "訂單已傳送至店家 LINE；Redis 完成設定後才會同步顯示於網站後台。",
    });
  } catch (error) {
    console.error("Order API error", error);
    return NextResponse.json(
      { error: "訂單送出失敗，請稍後再試或直接電話聯絡店家。" },
      { status: 500 },
    );
  }
}
