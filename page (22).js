"use client";

import { useEffect, useMemo, useState } from "react";

const monthNames = {7:"7 月",8:"8 月",9:"9 月",10:"10 月",11:"11 月",12:"12 月"};
const defaultProducts = [
  { id:"strawberry", name:"草莓鮮奶油蛋糕", desc:"當季草莓・香草布丁", price:"價格依尺寸與裝飾確認" },
  { id:"chocolate", name:"生巧克力蛋糕", desc:"法芙娜可可・生巧克力", price:"價格依尺寸與裝飾確認" },
  { id:"tiramisu", name:"提拉米蘇", desc:"馬斯卡彭・咖啡酒香", price:"價格依尺寸與裝飾確認" },
  { id:"earlgrey", name:"伯爵葡萄戚風", desc:"伯爵茶・新鮮綠葡萄", price:"價格依尺寸與裝飾確認" },
  { id:"basque", name:"巴斯克乳酪蛋糕", desc:"濃郁乳酪・焦香表層", price:"價格依尺寸與裝飾確認" }
];
const defaultSettings = {
  closedDates:["2026-08-19"],
  limitedDates:[],
  products:defaultProducts
};

function dateKey(y,m,d){
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function Calendar({month, settings, selected, onSelect}) {
  const year=2026;
  const first = new Date(year, month-1, 1).getDay();
  const days = new Date(year, month, 0).getDate();
  const cells = Array(first).fill(null).concat(Array.from({length:days},(_,i)=>i+1));
  return (
    <div className="calendar">
      <div className="week">{["日","一","二","三","四","五","六"].map(x=><b key={x}>{x}</b>)}</div>
      <div className="days">
        {cells.map((d,i)=>{
          if(!d) return <span key={`e${i}`} />;
          const key=dateKey(year,month,d);
          const closed=settings.closedDates.includes(key);
          const limited=settings.limitedDates.includes(key);
          const active=selected===key;
          return <button
            key={key}
            className={`${closed?"closed":limited?"limited":"open"} ${active?"active":""}`}
            disabled={closed}
            onClick={()=>onSelect(key)}
            aria-label={`${key}${closed?"已滿單":limited?"剩少量":"可預訂"}`}
          >{d}</button>
        })}
      </div>
    </div>
  )
}

export default function Home(){
  const [month,setMonth]=useState(7);
  const [settings,setSettings]=useState(defaultSettings);
  const [selected,setSelected]=useState("");
  const [product,setProduct]=useState("");
  const [open,setOpen]=useState(false);
  const [sending,setSending]=useState(false);
  const [message,setMessage]=useState("");

  useEffect(()=>{
    fetch("/api/settings").then(r=>r.json()).then(d=>setSettings(d)).catch(()=>{});
  },[]);

  const chosenProduct = useMemo(
    ()=>settings.products.find(p=>p.id===product),
    [settings.products,product]
  );

  function chooseDate(key){ setSelected(key); setOpen(true); setMessage(""); }
  function chooseProduct(id){ setProduct(id); document.querySelector("#calendar")?.scrollIntoView({behavior:"smooth"}); }

  async function submit(e){
    e.preventDefault();
    setSending(true); setMessage("");
    const data=Object.fromEntries(new FormData(e.currentTarget).entries());
    try{
      const r=await fetch("/api/order",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...data,date:selected})});
      const result=await r.json();
      if(!r.ok) throw new Error(result.error||"送出失敗");
      setMessage("訂單已送出！初甜趣收到後會再透過 LINE 或電話與你確認。");
      e.currentTarget.reset();
      setProduct("");
    }catch(err){ setMessage(err.message); }
    finally{ setSending(false); }
  }

  return <>
    <header>
      <a className="brand" href="#top"><span>✿ 初甜趣</span><small>HANDMADE DESSERT · SINCE 2026</small></a>
      <nav><a href="#calendar">可訂日期</a><a href="#products">人氣商品</a><a href="#about">關於我們</a><a href="#contact">聯絡我們</a></nav>
    </header>

    <main id="top">
      <section className="hero">
        <div>
          <p className="eyebrow">CHUTIAN BAKE · KAOHSIUNG</p>
          <h1>每一口，<br/>都是手作的溫度。</h1>
          <p className="lead">用甜點，收藏每一個值得紀念的時刻。</p>
          <a className="primary" href="#calendar">立即訂購 →</a>
          <p className="note">每日限量製作 · 使用動物性鮮奶油 · 無反式脂肪</p>
        </div>
        <div className="cake-art" aria-label="初甜趣手作蛋糕插畫">
          <div className="cake"><i/><i/><i/></div>
          <p>made with warmth</p>
        </div>
      </section>

      <section id="calendar" className="section calendar-section">
        <p className="eyebrow">AVAILABLE DATES</p>
        <h2>選擇取貨日期</h2>
        <div className="months">{Object.keys(monthNames).map(m=><button key={m} className={month===Number(m)?"on":""} onClick={()=>setMonth(Number(m))}>{monthNames[m]}</button>)}</div>
        <Calendar month={month} settings={settings} selected={selected} onSelect={chooseDate}/>
        <div className="legend"><span><i className="dot open"/>可預訂</span><span><i className="dot limited"/>剩少量</span><span><i className="dot closed"/>已滿單</span></div>
        <p className="hint">點選綠色或金色日期即可填寫訂購資料；灰色日期已滿單。</p>
      </section>

      <section className="features">
        {[
          ["♨","手工製作","每一顆甜點，皆用心製作"],
          ["♧","嚴選食材","安心美味，吃得到純粹"],
          ["♢","客製化服務","讓甜點成為專屬祝福"],
          ["♡","用心溫度","把幸福的味道傳遞給你"]
        ].map(x=><article key={x[1]}><b>{x[0]}</b><h3>{x[1]}</h3><p>{x[2]}</p></article>)}
      </section>

      <section id="products" className="section products">
        <p className="eyebrow">OUR DESSERTS</p><h2>人氣商品</h2><p>每日新鮮手作，依季節調整口味</p>
        <div className="product-grid">
          {settings.products.map((p,i)=><article key={p.id}>
            <span>0{i+1}</span><div className="dessert-icon">✿</div>
            <h3>{p.name}</h3><p>{p.desc}</p><small>{p.price}</small>
            <button onClick={()=>chooseProduct(p.id)}>選擇此品項 →</button>
          </article>)}
        </div>
      </section>

      <section id="about" className="about">
        <div className="logo-mark">✿<strong>初甜趣</strong><small>HANDMADE DESSERT</small></div>
        <div><p className="eyebrow">ABOUT CHUTIAN</p><h2>從第一口的甜，<br/>開始一段有趣的回憶。</h2>
        <p>初甜趣相信，甜點不只是味道，也是陪伴每個重要時刻的溫度。我們堅持小量手作、嚴選食材，讓每一顆蛋糕都保有細緻口感與真誠心意。</p>
        <p>不追求大量，只想把每一份甜，做好、做美，也做進你的回憶裡。</p></div>
      </section>

      <section id="contact" className="contact">
        <p className="eyebrow">CONTACT US</p><h2>把重要的日子，<br/>交給甜甜的我們。</h2>
        <p><a href="tel:0976172288">0976-172-288</a>　高雄市鳳山區經武路353之1號</p>
        <a className="primary" href="#calendar">先查看可訂日期 →</a>
      </section>
    </main>

    <footer>✿ 初甜趣 HANDMADE DESSERT · SINCE 2026<br/><small>© 2026 Chutian Bake. All Rights Reserved.</small></footer>

    {open && <div className="modal" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}>
      <div className="dialog">
        <button className="x" onClick={()=>setOpen(false)}>×</button>
        <p className="eyebrow">ORDER FORM</p><h2>填寫訂購資料</h2>
        <p className="selected-date">取貨日期：{selected}</p>
        <form onSubmit={submit}>
          <label>訂購品項<select name="product" value={product} onChange={e=>setProduct(e.target.value)} required>
            <option value="">請選擇</option>{settings.products.map(p=><option key={p.id} value={p.name}>{p.name}</option>)}
          </select></label>
          <div className="two"><label>尺寸<select name="size" required><option value="">請選擇</option><option>4 吋</option><option>6 吋</option><option>8 吋</option><option>其他／客製</option></select></label>
          <label>取貨時間<input name="pickupTime" type="time" required/></label></div>
          <div className="two"><label>姓名<input name="name" required/></label><label>電話<input name="phone" inputMode="tel" required/></label></div>
          <label>LINE 顯示名稱<input name="lineName" placeholder="方便店家核對聯絡"/></label>
          <label>蛋糕文字／蠟燭／其他備註<textarea name="note" rows="4"/></label>
          <label className="agree"><input type="checkbox" required/>我了解送出後仍須由店家確認，才算正式成立訂單。</label>
          <button className="primary submit" disabled={sending}>{sending?"傳送中…":"送出訂單"}</button>
          {message && <p className="result">{message}</p>}
        </form>
      </div>
    </div>}
  </>
}
