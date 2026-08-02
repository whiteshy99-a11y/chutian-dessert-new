export function cleanEnv(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

export function getRedisEnv() {
  const restUrl = cleanEnv(
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_URL
  );
  const restToken = cleanEnv(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_TOKEN
  );

  // Upstash Console 的一般連線字串（rediss://default:密碼@主機:6379）
  const tcpUrl = cleanEnv(
    process.env.REDIS_URL ||
    process.env.UPSTASH_REDIS_URL ||
    process.env.KV_URL
  );

  const restConfigured = Boolean(restUrl && restToken);
  const tcpConfigured = /^rediss?:\/\//i.test(tcpUrl);

  return {
    restUrl,
    restToken,
    tcpUrl,
    restConfigured,
    tcpConfigured,
    configured: restConfigured || tcpConfigured,
    transport: restConfigured ? "rest" : tcpConfigured ? "tcp" : "none",
  };
}
