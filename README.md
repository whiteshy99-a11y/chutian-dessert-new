# 初甜趣手作甜點 V5 正式版

包含：
- 2026 年 7–12 月可訂日曆、滿單／少量日期
- 現場現金與銀行匯款二選一
- 匯款資訊：連線商業銀行 824／111018312187（網站不顯示戶名）
- LINE 新訂單通知與 LINE 客服入口
- 訂單編號、付款狀態、訂單後台
- 後台修改公告、商品、日期、匯款資訊、客服連結、地圖與評論連結
- 常見問題、Google 地圖導航

## Vercel 必要環境變數
請參考 `.env.example`。

## 後台
部署後開啟 `/admin`。

## Upstash Redis
未串接 Redis 時，網站仍可送出 LINE 通知，但後台設定與訂單不會永久儲存。


## 正式訂單資料庫設定（Vercel）
程式同時支援以下任一方式：

1. `REDIS_URL`：從 Upstash Console 複製 `rediss://default:...` 連線字串（推薦，僅需一個變數）。
2. `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`：REST API 連線。

新增環境變數後必須重新部署。可開啟 `/api/system-status` 確認 `redisConfigured` 與 `redisReachable` 都是 `true`。
