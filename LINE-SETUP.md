# 初甜趣 LINE 訂單通知設定

在 Vercel 專案的 Settings → Environment Variables 新增：

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

部署完成後：

1. 到 LINE Developers 的 Messaging API 頁面。
2. Webhook URL 填入：`https://你的正式網址/api/line/webhook`
3. 按 Verify，確認成功後開啟 Use webhook。
4. 用店家自己的 LINE 加入初甜趣官方帳號 `@563shriq`。
5. 在聊天室輸入：`綁定店家`
6. 收到「綁定成功」後，網站新訂單就會推送到該聊天室。

備用方法：也可以直接在 Vercel 新增 `LINE_ADMIN_USER_ID`，程式會優先使用它。
