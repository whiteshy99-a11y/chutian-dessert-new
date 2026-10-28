import { NextResponse } from "next/server";
import { getRedisEnv } from "../../../lib/redis-env";
import { pingRedis } from "../../../lib/orders";

export async function GET() {
  const redis = getRedisEnv();
  let redisReachable = false;
  if (redis.configured) {
    try { redisReachable = await pingRedis(); } catch { redisReachable = false; }
  }
  return NextResponse.json({
    ok: true,
    redisConfigured: redis.configured,
    redisTransport: redis.transport,
    redisReachable,
    lineTokenConfigured: Boolean(String(process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim()),
    lineSecretConfigured: Boolean(String(process.env.LINE_CHANNEL_SECRET || "").trim()),
    lineAdminConfigured: Boolean(String(process.env.LINE_ADMIN_USER_ID || "").trim()),
    adminPasswordConfigured: Boolean(String(process.env.ADMIN_PASSWORD || "").trim()),
  });
}
