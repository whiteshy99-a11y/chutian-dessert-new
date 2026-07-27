import { NextResponse } from "next/server";
import { getSettings } from "../../../lib/settings";

export async function GET() {
  return NextResponse.json(await getSettings());
}
