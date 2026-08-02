# 初甜趣部署檢查

在 Vercel 的 `chutian-dessert-new` 專案中，至少要有：

- `UPSTASH_REDIS_REST_URL` 或 `KV_REST_API_URL`
- `UPSTASH_REDIS_REST_TOKEN` 或 `KV_REST_API_TOKEN`
- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `LINE_ADMIN_USER_ID`
- `ADMIN_PASSWORD`

新增或修改環境變數後，必須重新部署。

部署後可開啟 `/api/system-status`。所有需要的欄位都應顯示 `true`。

LINE Developers 的 Webhook URL：

`https://你的正式網址/api/line/webhook`

必須啟用 Use webhook。客人需先在 LINE 傳送訂單編號，系統才可在店家確認付款或取消時主動通知該客人。
