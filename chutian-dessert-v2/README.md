# 初甜趣手作甜點官網 V2

## 已完成
- 奶咖色響應式官網
- 2026 年 7–12 月訂購月曆
- 2026/08/19 預設滿單反灰
- 線上訂購表單
- LINE Messaging API 推播店家
- `/admin` 後台頁面
- 可選接 Upstash Redis，讓後台設定永久保存

## Vercel 部署
1. 解壓縮此資料夾。
2. 在 Vercel「New Project」頁面，點 `choose a folder`，選擇解壓縮後的整個 `chutian-dessert-v2` 資料夾。
3. 部署前在 Environment Variables 新增：
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_ADMIN_USER_ID`
   - `ADMIN_PASSWORD`
4. LINE Token 請先在 LINE Developers 按 `Reissue`，使用新的 Token，舊 Token 已在截圖中曝光。
5. 部署後測試送出訂單。

## 後台永久保存
若沒有設定 Upstash Redis，網站會使用內建預設資料，訂單 LINE 通知仍可正常使用，但後台按儲存會提示尚未設定資料庫。

要啟用後台永久保存，建立免費 Upstash Redis，將以下兩個值加入 Vercel：
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

後台網址：
`https://你的Vercel網址/admin`

## LINE Webhook
目前網站是「主動推播新訂單到你的 LINE」，不需要填 Webhook URL。
Webhook 只有在需要接收顧客傳給官方帳號的訊息或事件時才需要。
