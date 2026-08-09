"use client";

import { useEffect, useMemo, useState } from "react";

const monthNames = {7:"7 月",8:"8 月",9:"9 月",10:"10 月",11:"11 月",12:"12 月"};

const PRODUCTS = [
  {id:"fruit-basque",name:"水果焦香巴斯克（水果依季節搭配）",vegetarian:true,image:"/products/fruit-basque.jpeg",sizes:[{label:"6 吋",price:780}],ingredients:["焦香巴斯克乳酪蛋糕","當季新鮮水果","香緹鮮奶油"]},
  {id:"fruit-season",name:"水果季（水果依季節搭配）",vegetarian:true,image:"/products/fruit-season.jpeg",sizes:[{label:"4 吋",price:680},{label:"6 吋",price:850},{label:"8 吋",price:1250}],ingredients:["原味戚風蛋糕","當季新鮮水果","滑嫩布丁","香草外交官"]},
  {id:"blueberry-forest",name:"藍莓森林",vegetarian:true,image:"/products/blueberry-forest.jpeg",sizes:[{label:"4 吋",price:580},{label:"6 吋",price:780},{label:"8 吋",price:1180}],ingredients:["巧克力戚風蛋糕","手熬藍莓果醬","滑嫩布丁"]},
  {id:"summer-mango",name:"夏日芒果",vegetarian:true,seasonalUnavailable:true,image:"/products/summer-mango.jpeg",sizes:[{label:"4 吋",price:680},{label:"6 吋",price:850},{label:"8 吋",price:1250}],ingredients:["原味戚風蛋糕","香草外交官醬","手熬草莓果醬","滑嫩布丁"]},
  {id:"saint-anna",name:"聖安娜焙茶",vegetarian:true,image:"/products/saint-anna.jpeg",sizes:[{label:"6 吋",price:850},{label:"8 吋",price:1250}],ingredients:["焙茶戚風蛋糕","無籽綠葡萄","滑嫩布丁"]},
  {id:"2d-cake",name:"二次元蛋糕",vegetarian:true,image:"/products/2d-cake.jpeg",sizes:[{label:"6 吋",price:880},{label:"8 吋",price:1280}],ingredients:["原味戚風蛋糕","手熬草莓果醬","滑嫩布丁"]},
  {id:"lemon-cake",name:"老奶奶檸檬糖霜蛋糕",vegetarian:true,image:"/products/lemon-cake.jpeg",sizes:[{label:"6 吋",price:380}],ingredients:["檸檬蛋糕","檸檬糖霜"]},
  {id:"taro-flower",name:"芋泥小花",vegetarian:true,image:"/products/taro-flower.jpeg",sizes:[{label:"4 吋",price:580},{label:"6 吋",price:780},{label:"8 吋",price:1180},{label:"10 吋",price:1780},{label:"12 吋",price:2100}],ingredients:["原味戚風蛋糕","香甜芋泥","滑嫩布丁"]},
  {id:"green-grape-smile",name:"綠葡萄難哄",vegetarian:true,image:"/products/green-grape-smile.jpeg",sizes:[{label:"4 吋",price:580},{label:"6 吋",price:780},{label:"8 吋",price:1180}],ingredients:["原味戚風蛋糕","無籽綠葡萄","滑嫩布丁"]},
  {id:"green-grape",name:"綠葡萄小清新",vegetarian:true,image:"/products/green-grape.jpeg",sizes:[{label:"4 吋",price:580},{label:"6 吋",price:780},{label:"8 吋",price:1180},{label:"10 吋",price:1780}],ingredients:["原味戚風蛋糕","無籽綠葡萄","滑嫩布丁","香草外交官"]},
  {id:"oreo-smile",name:"操灰搭",vegetarian:true,image:"/products/oreo-smile.jpeg",sizes:[{label:"4 吋",price:680},{label:"6 吋",price:980},{label:"8 吋",price:1280}],ingredients:["可可戚風蛋糕","手熬草莓果醬","滑嫩布丁"]},
  {id:"blueberry-chocolate-smile",name:"藍莓巧克力難哄（水果依季節搭配）",vegetarian:true,image:"/products/blueberry-chocolate-smile.jpeg",sizes:[{label:"4 吋",price:680},{label:"6 吋",price:980},{label:"8 吋",price:1280}],ingredients:["可可戚風蛋糕","手熬藍莓果醬","滑嫩布丁"]},
  {id:"mikan-earl-grey",name:"蜜柑伯爵奶凍焙茶",image:"/products/mikan-earl-grey.jpeg",sizes:[{label:"4 吋",price:580},{label:"6 吋",price:780},{label:"8 吋",price:1180}],ingredients:["焙茶戚風蛋糕","蜜柑果肉","伯爵奶凍"]},
  {id:"black-cherry-chocolate",name:"黑櫻桃巧克力裸蛋糕",vegetarian:true,image:"/products/black-cherry-chocolate.jpeg",sizes:[{label:"4 吋",price:680},{label:"6 吋",price:850},{label:"8 吋",price:1250}],ingredients:["可可戚風蛋糕","巧克力香緹","黑櫻桃","巧克力脆脆"]},
  {id:"fruit-naked",name:"水果裸蛋糕（水果依季節搭配）",vegetarian:true,image:"/products/fruit-naked.jpeg",sizes:[{label:"5 吋",price:798},{label:"7 吋",price:1288}],ingredients:["原味戚風蛋糕","當季水果","香緹鮮奶油","香草外交官奶醬"]},
  {id:"strawberry-chantilly",name:"草莓香緹",vegetarian:true,image:"/products/strawberry-chantilly.jpeg",sizes:[{label:"6 吋",price:780},{label:"8 吋",price:1180}],ingredients:["原味戚風蛋糕","手熬草莓果醬","滑嫩布丁"]},
  {id:"custom-figure",name:"客製公仔蛋糕",custom:true,image:"/products/custom-1.jpeg",gallery:["/products/custom-1.jpeg","/products/custom-2.jpeg","/products/custom-3.jpeg","/products/custom-4.jpeg","/products/custom-5.jpeg","/products/custom-6.jpeg"],sizes:[{label:"6 吋（含公仔／道具）",price:1250,suffix:"起"},{label:"8 吋（含公仔／道具）",price:1550,suffix:"起"},{label:"6 吋（公仔自備）",price:880},{label:"8 吋（公仔自備）",price:1280}],ingredients:["內餡與主題請透過官方 LINE 討論","客製道具需提前 14～30 個工作天預訂"]}
];

const defaultSettings = {
  closedDates:["2026-08-19"], limitedDates:[], bankName:"連線商業銀行", bankCode:"824", bankAccount:"111018312187",
  bankNote:"送出訂單後，請加入 LINE 客服並上傳付款截圖，經店家確認後訂單才會成立。", lineUrl:"https://line.me/R/ti/p/@563shriq", serviceHours:"每日 10:00–20:00", announcement:"",
  mapUrl:"https://www.google.com/maps/search/?api=1&query=高雄市鳳山區經武路353之1號", reviewUrl:""
};

function money(n){return `NT$${Number(n).toLocaleString("zh-TW")}`}
function priceText(p){return p.sizes.map(s=>`${s.label} ${money(s.price)}${s.suffix?` ${s.suffix}`:""}`).join("｜")}
function dateKey(y,m,d){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`}

const PICKUP_TIMES = Array.from({length:13},(_,i)=>{
  const total=14*60+i*30;
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
});

function Calendar({month, settings, selected, onSelect}) {
  const year=2026, first=new Date(year,month-1,1).getDay(), days=new Date(year,month,0).getDate();
  const cells=Array(first).fill(null).concat(Array.from({length:days},(_,i)=>i+1));
  return <div className="calendar"><div className="week">{["日","一","二","三","四","五","六"].map(x=><b key={x}>{x}</b>)}</div><div className="days">{cells.map((d,i)=>{
    if(!d)return <span key={`e${i}`}/>; const key=dateKey(year,month,d),closed=settings.closedDates.includes(key),limited=settings.limitedDates.includes(key),active=selected===key;
    return <button key={key} className={`${closed?"closed":limited?"limited":"open"} ${active?"active":""}`} disabled={closed} onClick={()=>onSelect(key)}>{d}</button>
  })}</div></div>
}

function ProductCard({p,onChoose}){
  return <article className={`product-card ${p.seasonalUnavailable?"seasonal-unavailable":""}`}>
    <div className="product-photo"><img src={p.image} alt={p.name}/>{p.vegetarian&&<span className="veg-tag">蛋奶素</span>}{p.seasonalUnavailable&&<><span className="seasonal-tag">季節限定</span><span className="seasonal-x" aria-hidden="true">×</span></>}</div>
    <div className="product-body"><h3>{p.name}</h3><p className="price-line">{priceText(p)}</p><ul>{p.ingredients.map(x=><li key={x}>{x}</li>)}</ul>
    {p.custom?<a className="product-action" href="#contact">前往 LINE 討論 →</a>:p.seasonalUnavailable?<span className="product-action product-unavailable">季節限定 ×</span>:<button className="product-action" onClick={()=>onChoose(p.id)}>選擇此品項 →</button>}</div>
  </article>
}

export default function Home(){
  const [month,setMonth]=useState(7),[settings,setSettings]=useState(defaultSettings),[selected,setSelected]=useState(""),[productId,setProductId]=useState(""),[open,setOpen]=useState(false),[sending,setSending]=useState(false),[message,setMessage]=useState(""),[orderId,setOrderId]=useState("");
  const selectedProduct=useMemo(()=>PRODUCTS.find(p=>p.id===productId),[productId]);
  useEffect(()=>{fetch("/api/settings").then(r=>r.json()).then(d=>setSettings({...defaultSettings,...d})).catch(()=>{});},[]);
  function chooseDate(key){setSelected(key);setOpen(true);setMessage("");setOrderId("")}
  function chooseProduct(id){setProductId(id);document.querySelector("#calendar")?.scrollIntoView({behavior:"smooth"})}
  async function submit(e){e.preventDefault();const form=e.currentTarget;setSending(true);setMessage("");setOrderId("");const data=Object.fromEntries(new FormData(form).entries());try{const r=await fetch("/api/order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,product:selectedProduct?.name||data.product,date:selected,paymentMethod:"bank"})});const result=await r.json();if(!r.ok)throw new Error(result.error||"送出失敗");setOrderId(result.orderId||"");form.reset();setProductId("")}catch(err){setMessage(err instanceof Error?err.message:"訂單送出失敗，請稍後再試。") }finally{setSending(false)}}

  return <>
    <header><a className="brand brand-text" href="#top"><span className="brand-title">✿ 初甜趣</span><span className="brand-subtitle">HANDMADE DESSERT · SINCE 2026</span></a><nav><a href="#calendar">可訂日期</a><a href="#products">商品</a><a href="#custom">客製蛋糕</a><a href="#about">品牌故事</a><a href="#contact">聯絡我們</a></nav></header>
    <main id="top">
      {settings.announcement&&<div className="announcement">📢 {settings.announcement}</div>}
      <section className="hero hero-photo"><div className="hero-copy"><p className="eyebrow">CHUTIAN BAKE · KAOHSIUNG</p><h1>每一口，<br/>都是手作的溫度。</h1><p className="lead">動物性鮮奶油、新鮮水果、日本進口麵粉與減糖配方。</p><a className="primary" href="#products">瀏覽商品 →</a><p className="note">奶油不甜膩，是客人最常給初甜趣的回饋。</p></div><div className="hero-fixed-photo"><img src="/products/fruit-season.jpeg" alt="水果季蛋糕"/></div></section>

      <section id="calendar" className="section calendar-section"><p className="eyebrow">AVAILABLE DATES</p><h2>選擇取貨日期</h2><div className="months">{Object.keys(monthNames).map(m=><button key={m} className={month===Number(m)?"on":""} onClick={()=>setMonth(Number(m))}>{monthNames[m]}</button>)}</div><Calendar month={month} settings={settings} selected={selected} onSelect={chooseDate}/><div className="legend"><span><i className="dot open"/>可預訂</span><span><i className="dot limited"/>剩少量</span><span><i className="dot closed"/>已滿單</span></div><p className="hint">點選可預訂日期填寫訂購資料；灰色日期無法選擇。</p></section>

      <section className="features">{[["♨","動物性鮮奶油","不使用植物性鮮奶油"],["♧","嚴選食材","新鮮水果與日本進口麵粉"],["♢","減糖配方","保留食材原本的香氣"],["♡","小量手作","依訂單製作每一顆蛋糕"]].map(x=><article key={x[1]}><b>{x[0]}</b><h3>{x[1]}</h3><p>{x[2]}</p></article>)}</section>

      <section id="products" className="section products"><p className="eyebrow">OUR DESSERTS</p><h2>商品一覽</h2><p>商品卡呈現照片、尺寸、價格與實際內容物。</p><div className="product-grid product-grid-photo">{PRODUCTS.filter(p=>!p.custom).map(p=><ProductCard key={p.id} p={p} onChoose={chooseProduct}/>)}</div></section>

      <section id="custom" className="section custom-section"><p className="eyebrow">CUSTOM CAKES</p><h2>客製公仔蛋糕</h2><p>公仔、道具與主題細節皆透過官方 LINE 討論。</p><div className="custom-gallery">{PRODUCTS.find(p=>p.custom).gallery.map((src,i)=><img src={src} alt={`初甜趣客製公仔蛋糕作品 ${i+1}`} key={src}/>)}</div><div className="custom-info"><div><h3>含公仔／道具</h3><p>6 吋｜NT$1,250 起</p><p>8 吋｜NT$1,550 起</p></div><div><h3>公仔自備</h3><p>6 吋｜NT$880</p><p>8 吋｜NT$1,280</p></div><div className="custom-notice"><strong>客製道具需提前 14～30 個工作天預訂</strong><p>造型、配色、文字與報價請先透過官方 LINE 確認。</p></div></div>{settings.lineUrl&&<a className="primary" href={settings.lineUrl} target="_blank" rel="noreferrer">加入 LINE 討論主題 →</a>}</section>

      <section id="about" className="about"><div className="logo-mark brand-text about-brand"><span className="brand-title">✿ 初甜趣</span><span className="brand-subtitle">HANDMADE DESSERT · SINCE 2026</span></div><div><p className="eyebrow">ABOUT CHUTIAN</p><h2>奶油不甜膩，<br/>是我們的招牌。</h2><p>客人常說：「甜而不膩」、「奶油很綿密」、「奶香很濃郁」、「蛋糕體濕潤」。</p><p>初甜趣堅持使用動物性鮮奶油、不使用植物性鮮奶油，搭配新鮮水果、日本進口麵粉、嚴選茶粉與天然食材，以減糖配方完成每一份甜點。</p></div></section>

      <section className="section faq" id="faq"><p className="eyebrow">ORDER INFORMATION</p><h2>訂購與取貨</h2><div className="faq-grid"><details><summary>取貨方式</summary><p>門市自取為主，如有配送需求，可協助安排 Lalamove，運費由顧客自行負擔。</p></details><details><summary>送出表單就代表訂單成立嗎？</summary><p>送出訂單後，請加入 LINE 客服並上傳付款截圖，經店家確認後訂單才會成立。</p></details><details><summary>客製蛋糕多久前預訂？</summary><p>客製道具需至少提前 14～30 個工作天預訂，並先透過官方 LINE 討論主題、造型與報價。</p></details><details><summary>付款方式</summary><p>銀行轉帳匯款</p></details></div></section>

      <section id="contact" className="contact"><p className="eyebrow">CONTACT US</p><h2>把重要的日子，<br/>交給甜甜的我們。</h2><p><a href="tel:0976172288">0976-172-288</a>　高雄市鳳山區經武路353之1號</p><p className="service-hours">客服回覆時間：{settings.serviceHours}</p><p className="delivery-note">門市自取｜可協助安排 Lalamove，運費由顧客負擔</p><div className="contact-actions"><a className="primary" href="#calendar">查看可訂日期 →</a>{settings.lineUrl&&<a className="secondary" href={settings.lineUrl} target="_blank" rel="noreferrer">LINE 客服</a>}{settings.mapUrl&&<a className="secondary" href={settings.mapUrl} target="_blank" rel="noreferrer">Google 地圖導航</a>}</div></section>
    </main>
    <footer><div className="brand-text footer-brand"><span className="brand-title">✿ 初甜趣</span><span className="brand-subtitle">HANDMADE DESSERT · SINCE 2026</span></div><small>© 2026 Chutian Bake. All Rights Reserved.</small></footer>
    {settings.lineUrl&&<a className="line-float" href={settings.lineUrl} target="_blank" rel="noreferrer">LINE 客服</a>}

    {open&&<div className="modal" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="dialog"><button className="x" onClick={()=>setOpen(false)}>×</button>{orderId?<div className="order-success"><p className="success-icon">✓</p><p className="eyebrow">ORDER RECEIVED</p><h2>訂單已送出</h2><p>您的訂單資料已收到，請完成以下步驟。</p><div className="order-number"><span>訂單編號</span><strong>{orderId}</strong></div><div className="success-steps"><p><b>1.</b> 加入 LINE 官方帳號</p><p><b>2.</b> 提供訂單編號及匯款截圖</p><p><b>3.</b> 經店家確認款項後，訂單才正式成立</p></div><div className="success-reminder"><b>提醒您</b><br/>請截圖或記下訂單編號，方便店家核對。</div>{settings.lineUrl&&<a className="line-success" href={settings.lineUrl} target="_blank" rel="noreferrer">加入 LINE 官方帳號 →</a>}</div>:<><p className="eyebrow">ORDER FORM</p><h2>填寫訂購資料</h2><p className="selected-date">取貨日期：{selected}</p><form onSubmit={submit}>
      <label>訂購品項<select name="product" value={productId} onChange={e=>setProductId(e.target.value)} required><option value="">請選擇</option>{PRODUCTS.filter(p=>!p.custom&&!p.seasonalUnavailable).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <div className="two"><label>尺寸<select name="size" required><option value="">請選擇</option>{selectedProduct?.sizes.map(s=><option key={s.label} value={s.label}>{s.label}｜{money(s.price)}{s.suffix?` ${s.suffix}`:""}</option>)}</select></label><label>取貨時間<select name="pickupTime" required><option value="">請選擇</option>{PICKUP_TIMES.map(t=><option key={t} value={t}>{t}</option>)}</select></label></div>
      <input type="hidden" name="productName" value={selectedProduct?.name||""}/>
      <div className="two"><label>用途<select name="occasion"><option>生日</option><option>彌月</option><option>節慶</option><option>公司活動</option><option>其他</option></select></label></div>
      <div className="two"><label>姓名<input name="name" required/></label><label>電話<input name="phone" inputMode="tel" required/></label></div><label>LINE 顯示名稱<input name="lineName" placeholder="方便店家核對聯絡"/></label>
      <div className="payment-summary"><span>付款方式</span><strong>銀行轉帳匯款</strong></div>
      <div className="bank-card"><h3>銀行匯款資訊</h3><p><b>銀行：</b>{settings.bankName}</p><p><b>代碼：</b>{settings.bankCode}</p><p><b>帳號：</b>{settings.bankAccount}</p><button type="button" className="copy-bank" onClick={()=>navigator.clipboard?.writeText(settings.bankAccount)}>複製帳號</button><small>送出訂單後，請加入 LINE 客服並提供訂單編號、上傳付款截圖；經店家確認後訂單才會成立。匯款不設期限，訂單也不會自動取消。</small></div>
      <label>蛋糕文字／蠟燭／盤叉／其他備註<textarea name="note" rows="4"/></label><label className="agree"><input type="checkbox" required/>我了解送出後仍須由店家確認，才算正式成立訂單。</label>{message&&<div className="form-error">{message}</div>}<button className="primary submit" disabled={sending}>{sending?"傳送中…":"送出訂單"}</button>
    </form></>}</div></div>}
  </>
}
