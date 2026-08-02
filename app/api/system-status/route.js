import { NextResponse } from "next/server";
import { getRedisEnv } from "../../../lib/redis-env";

export async function GET() {
  const redis = getRedisEnv();
  return NextResponse.json({
    ok: true,
    redisConfigured: redis.configured,
    lineTokenConfigured: Boolean(String(process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim()),
    lineSecretConfigured: Boolean(String(process.env.LINE_CHANNEL_SECRET || "").trim()),
    lineAdminConfigured: Boolean(String(process.env.LINE_ADMIN_USER_ID || "").trim()),
    adminPasswordConfigured: Boolean(String(process.env.ADMIN_PASSWORD || "").trim()),
  });
}
