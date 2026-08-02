# V1.6 訂單與 LINE 修正

- 訂單 API 不再因 Redis 尚未設定就立即拒絕客人送單。
- Redis 可用時，訂單照常寫入網站後台。
- Redis 尚未設定時，完整訂單會先推送至店家 LINE，並仍回傳訂單編號與待付款狀態。
- 若 Redis 與店家 LINE 兩者都失敗，才會回傳送單失敗，避免產生無人收到的幽靈訂單。
- LINE API 錯誤會寫入 Vercel Runtime Logs，方便判斷 Token 或店家 User ID 問題。
- 保留訂單不設匯款期限、不自動取消的規則。
