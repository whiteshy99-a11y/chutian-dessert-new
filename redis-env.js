function stripOuterQuotes(value) {
  const text = String(value || "").trim();
  if (
    text.length >= 2 &&
    ((text.startsWith('"') && text.endsWith('"')) ||
      (text.startsWith("'") && text.endsWith("'")))
  ) {
    return text.slice(1, -1).trim();
  }
  return text;
}

export function cleanEnv(value) {
  return stripOuterQuotes(value);
}

function cleanUrl(value) {
  return stripOuterQuotes(value).replace(/\/+$/, "");
}

export function getRedisEnv() {
  const restUrl = cleanUrl(
    process.env.UPSTASH_REDIS_REST_URL ||
      process.env.KV_REST_API_URL ||
      process.env.REDIS_REST_URL,
  );

  // Token 不能移除結尾的「/」。Upstash Token 屬於憑證內容，任何字元變動都會造成 401/403。
  const restToken = cleanEnv(
    process.env.UPSTASH_REDIS_REST_TOKEN ||
      process.env.KV_REST_API_TOKEN ||
      process.env.REDIS_REST_TOKEN,
  );

  const tcpUrl = cleanUrl(
    process.env.REDIS_URL ||
      process.env.UPSTASH_REDIS_URL ||
      process.env.KV_URL,
  );

  const restConfigured = /^https:\/\//i.test(restUrl) && Boolean(restToken);
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
