export function cleanEnv(value) {
  return String(value || "").trim().replace(/^['"]|['"]$/g, "").replace(/\/+$/, "");
}

export function getRedisEnv() {
  const url = cleanEnv(
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.KV_REST_API_URL ||
    process.env.REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_URL
  );
  const token = cleanEnv(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_TOKEN ||
    process.env.REDIS_REST_TOKEN ||
    process.env.UPSTASH_REDIS_TOKEN
  );
  return { url, token, configured: Boolean(url && token) };
}
