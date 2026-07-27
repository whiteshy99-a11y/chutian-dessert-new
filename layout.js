import "./globals.css";

export const metadata = {
  title: "初甜趣手作甜點｜高雄鳳山生日蛋糕",
  description: "每日限量手作，使用動物性鮮奶油、無反式脂肪。線上選擇日期並送出訂單。",
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-Hant">
      <body>{children}</body>
    </html>
  );
}
