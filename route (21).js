import { NextResponse } from "next/server";
import { saveSettings } from "../../../../lib/settings";

export async function POST(req) {
  try {
    const { password, settings } = await req.json();
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({error:"後台密碼錯誤。"}, {status:401});
    }
    if (!Array.isArray(settings?.closedDates) || !Array.isArray(settings?.products)) {
      return NextResponse.json({error:"資料格式不正確。"}, {status:400});
    }
    await saveSettings(settings);
    return NextResponse.json({ok:true});
  } catch (e) {
    return NextResponse.json({error:e.message || "儲存失敗。"}, {status:500});
  }
}
