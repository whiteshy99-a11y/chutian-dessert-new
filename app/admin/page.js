"use client";
import { useEffect, useMemo, useState } from "react";

const statusOptions=["全部","待付款","已付款","已取消"];
const statusIcon={"待付款":"🟡","已付款":"🟢","已取消":"🔴"};
function formatTaipei(value){if(!value)return "—";try{return new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}catch{return value}}
function taipeiDate(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
function taipeiMonth(){return taipeiDate().slice(0,7)}
function money(value){return new Intl.NumberFormat("zh-TW",{style:"currency",currency:"TWD",maximumFractionDigits:0}).format(Number(value||0))}

export default function Admin(){
  const [password,setPassword]=useState("");
  const [data,setData]=useState(null);
  const [orders,setOrders]=useState([]);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("全部");
  const [msg,setMsg]=useState("");
  const [working,setWorking]=useState("");
  const [authenticated,setAuthenticated]=useState(false);
  const [closedDatesText,setClosedDatesText]=useState("");
  const [onsiteProducts,setOnsiteProducts]=useState([]);
  const [onsiteDate,setOnsiteDate]=useState(taipeiDate());
  const [onsiteQuantities,setOnsiteQuantities]=useState({});
  const [onsiteExtras,setOnsiteExtras]=useState([]);
  const [revenueMonth,setRevenueMonth]=useState(taipeiMonth());
  const [revenueData,setRevenueData]=useState(null);
  const [salesWorking,setSalesWorking]=useState(false);

  async function login(event){
    event?.preventDefault();
    setMsg("登入中…");
    const r=await fetch("/api/admin/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});
    const j=await r.json();
    if(!r.ok){setMsg(j.error||"登入失敗");return;}
    const settingsResponse=await fetch("/api/settings",{cache:"no-store"});
    const settings=await settingsResponse.json();
    setData(settings);
    setClosedDatesText((settings.closedDates||[]).join("\n"));
    setOrders(j.orders||[]);
    setAuthenticated(true);
    setMsg("");
    await loadSales(password,revenueMonth);
  }
  const updateList=(key,value)=>setData({...data,[key]:value.split(/\s*,\s*|\n+/).filter(Boolean)});
  const updateField=(key,value)=>setData({...data,[key]:value});
  const parseClosedDates=(value)=>[...new Set(value.split(/\n+/).map(v=>v.trim()).filter(Boolean))].sort();
  async function saveClosedDates(value=closedDatesText){
    const entries=parseClosedDates(value);
    const invalid=entries.filter(v=>!/^\d{4}-\d{2}-\d{2}$/.test(v));
    if(invalid.length){setMsg(`日期格式錯誤：${invalid.join("、")}。請使用 YYYY-MM-DD，一行一個日期。`);return;}
    const nextData={...data,closedDates:entries};
    setData(nextData);
    setClosedDatesText(entries.join("\n"));
    setMsg("儲存滿單日期中…");
    const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,settings:nextData})});
    const j=await r.json();
    setMsg(r.ok?"滿單日期已儲存並同步到網站。":j.error||"滿單日期儲存失敗");
  }
  async function removeClosedDate(date){
    const nextDates=data.closedDates.filter(d=>d!==date);
    await saveClosedDates(nextDates.join("\n"));
  }
  async function save(){setMsg("儲存中…");const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,settings:data})});const j=await r.json();setMsg(r.ok?"已儲存並同步到網站。":j.error||"儲存失敗");}
  async function loadOrders(){setMsg("讀取訂單中…");const r=await fetch("/api/admin/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});const j=await r.json();if(r.ok){setOrders(j.orders||[]);setMsg(`已讀取 ${j.orders?.length||0} 筆訂單。`)}else setMsg(j.error||"讀取失敗");}
  async function changeStatus(orderId,status){
    setWorking(orderId);setMsg("更新訂單中…");
    const r=await fetch("/api/admin/order-status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,orderId,status})});
    const j=await r.json();
    if(r.ok){setOrders(current=>current.map(o=>o.orderId===orderId?j.order:o));setMsg(j.notification?.sent?`已更新為「${status}」，並已透過 LINE 通知客人。`:`已更新為「${status}」。${j.notification?.reason?`（${j.notification.reason}）`:""}`);await loadSales(password,revenueMonth);}else setMsg(j.error||"更新失敗");
    setWorking("");
  }
  async function loadSales(pwd=password,month=revenueMonth){
    setSalesWorking(true);
    const r=await fetch("/api/admin/onsite-sales",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password:pwd,action:"load",month})});
    const j=await r.json();
    if(r.ok){setRevenueData(j);setOnsiteProducts(j.products||[]);setOnsiteQuantities(j.daily?.[onsiteDate]||{});setOnsiteExtras(j.extrasByDate?.[onsiteDate]||[]);}else setMsg(j.error||"營收資料讀取失敗");
    setSalesWorking(false);
  }
  async function saveOnsiteProducts(){
    setSalesWorking(true);setMsg("儲存現場品項中…");
    const r=await fetch("/api/admin/onsite-sales",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,action:"saveProducts",products:onsiteProducts,month:revenueMonth})});
    const j=await r.json();
    if(r.ok){setRevenueData(j);setOnsiteProducts(j.products||[]);setOnsiteQuantities(j.daily?.[onsiteDate]||{});setOnsiteExtras(j.extrasByDate?.[onsiteDate]||[]);setMsg("現場小蛋糕品項已儲存。");}else setMsg(j.error||"品項儲存失敗");
    setSalesWorking(false);
  }
  async function saveDailySales(){
    setSalesWorking(true);setMsg("儲存今日現場銷售中…");
    const r=await fetch("/api/admin/onsite-sales",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,action:"saveDaily",date:onsiteDate,quantities:onsiteQuantities,extras:onsiteExtras,month:revenueMonth})});
    const j=await r.json();
    if(r.ok){setRevenueData(j);setOnsiteQuantities(j.daily?.[onsiteDate]||{});setOnsiteExtras(j.extrasByDate?.[onsiteDate]||[]);setMsg(`${onsiteDate} 現場銷售已儲存。`);}else setMsg(j.error||"現場銷售儲存失敗");
    setSalesWorking(false);
  }
  function changeOnsiteDate(date){setOnsiteDate(date);setOnsiteQuantities(revenueData?.daily?.[date]||{});setOnsiteExtras(revenueData?.extrasByDate?.[date]||[]);}
  async function changeRevenueMonth(month){
    setRevenueMonth(month);
    const nextDate=onsiteDate.startsWith(`${month}-`)?onsiteDate:`${month}-01`;
    setOnsiteDate(nextDate);
    setSalesWorking(true);
    const r=await fetch("/api/admin/onsite-sales",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,action:"load",month})});
    const j=await r.json();
    if(r.ok){setRevenueData(j);setOnsiteProducts(j.products||[]);setOnsiteQuantities(j.daily?.[nextDate]||{});setOnsiteExtras(j.extrasByDate?.[nextDate]||[]);}else setMsg(j.error||"營收資料讀取失敗");
    setSalesWorking(false);
  }
  const fixedTodayTotal=useMemo(()=>onsiteProducts.reduce((sum,p)=>sum+Number(onsiteQuantities[p.id]||0)*Number(p.price||0),0),[onsiteProducts,onsiteQuantities]);
  const extrasTodayTotal=useMemo(()=>onsiteExtras.reduce((sum,item)=>sum+Number(item.price||0)*Number(item.quantity||0),0),[onsiteExtras]);
  const onsiteTodayTotal=fixedTodayTotal+extrasTodayTotal;
  const dailyRevenueRows=useMemo(()=>{
    const websiteDays=revenueData?.websiteSummary?.days||[];
    const onsiteDays=revenueData?.onsiteSummary?.days||[];
    const map=new Map();
    for(const day of websiteDays) map.set(day.date,{date:day.date,websiteRevenue:Number(day.revenue||0),websiteCount:Number(day.count||0),websiteOrders:day.orders||[],onsiteRevenue:0,onsiteDay:null});
    for(const day of onsiteDays){const current=map.get(day.date)||{date:day.date,websiteRevenue:0,websiteCount:0,websiteOrders:[],onsiteRevenue:0,onsiteDay:null};current.onsiteRevenue=Number(day.revenue||0);current.onsiteDay=day;map.set(day.date,current);}
    return [...map.values()].map(row=>({...row,totalRevenue:row.websiteRevenue+row.onsiteRevenue})).sort((a,b)=>b.date.localeCompare(a.date));
  },[revenueData]);
  const filtered=useMemo(()=>orders.filter(o=>(filter==="全部"||o.status===filter)&&[o.orderId,o.name,o.phone,o.date,o.product,o.lineName].join(" ").toLowerCase().includes(query.toLowerCase())),[orders,query,filter]);
  const stats=useMemo(()=>{
    const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    return {
      today:orders.filter(o=>String(o.createdAt||"").slice(0,10)===today).length,
      pending:orders.filter(o=>o.status==="待付款").length,
      paid:orders.filter(o=>o.status==="已付款").length,
      cancelled:orders.filter(o=>o.status==="已取消").length,
    };
  },[orders]);
  if(!authenticated)return <main style={{maxWidth:460,margin:"80px auto",padding:"28px 20px",fontFamily:"Arial,sans-serif",color:"#4b382d"}}>
    <h1>初甜趣網站後台</h1>
    <form onSubmit={login} style={{display:"grid",gap:14,marginTop:24}}>
      <label style={{display:"grid",gap:8}}>後台密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" style={{padding:12,border:"1px solid #d9c5b4",borderRadius:10}}/></label>
      <button type="submit" style={{padding:"12px 18px",border:0,borderRadius:10,background:"#6d4939",color:"white",cursor:"pointer"}}>登入</button>
    </form>
    {msg&&<p style={{fontWeight:700,marginTop:16}}>{msg}</p>}
  </main>;
  if(!data)return <main style={{padding:40}}>載入中…</main>;

  return <main className="admin">
    <h1>初甜趣網站後台</h1>
    <section><h2>首頁與客服</h2><label>首頁公告<input value={data.announcement||""} onChange={e=>updateField("announcement",e.target.value)} placeholder="例如：父親節檔期已滿單"/></label><label>LINE 官方帳號連結<input value={data.lineUrl||""} onChange={e=>updateField("lineUrl",e.target.value)} placeholder="https://lin.ee/xxxxxxx"/></label><label>客服回覆時間<input value={data.serviceHours||""} onChange={e=>updateField("serviceHours",e.target.value)}/></label><label>Google 地圖連結<input value={data.mapUrl||""} onChange={e=>updateField("mapUrl",e.target.value)}/></label><label>Google 評論連結<input value={data.reviewUrl||""} onChange={e=>updateField("reviewUrl",e.target.value)}/></label></section>
    <section><h2>匯款資訊</h2><div className="grid3"><input value={data.bankName||""} onChange={e=>updateField("bankName",e.target.value)} placeholder="銀行名稱"/><input value={data.bankCode||""} onChange={e=>updateField("bankCode",e.target.value)} placeholder="銀行代碼"/><input value={data.bankAccount||""} onChange={e=>updateField("bankAccount",e.target.value)} placeholder="匯款帳號"/></div><label>匯款提醒<textarea rows="3" value={data.bankNote||""} onChange={e=>updateField("bankNote",e.target.value)}/></label><p className="privacy">網站不顯示戶名；訂單不設定匯款期限，也不會自動取消。</p></section>
    <section><h2>行事曆</h2>
      <label>滿單日期（可一次輸入多天）
        <textarea rows="7" value={closedDatesText} onChange={e=>setClosedDatesText(e.target.value)} placeholder={"2026-08-19\n2026-08-20\n2026-08-21"}/>
      </label>
      <p className="calendar-help">請使用 <b>YYYY-MM-DD</b> 格式，<b>一行一個日期</b>；不用逗號、頓號或分號。</p>
      <button type="button" className="calendar-save" onClick={()=>saveClosedDates()}>儲存滿單日期</button>
      <div className="closed-date-list">
        <b>目前滿單日期</b>
        {data.closedDates.length===0?<p>目前沒有設定滿單日期。</p>:data.closedDates.map(date=><div className="closed-date-item" key={date}><span>{date}</span><button type="button" onClick={()=>removeClosedDate(date)}>刪除</button></div>)}
      </div>
      <label>剩少量日期<textarea rows="5" value={data.limitedDates.join("\n")} onChange={e=>updateList("limitedDates",e.target.value)}/></label>
    </section>
    <section><h2>商品</h2>{data.products.map((p,i)=><div className="product-row" key={p.id}><input value={p.name} onChange={e=>{const a=[...data.products];a[i]={...p,name:e.target.value};setData({...data,products:a})}}/><input value={p.desc} onChange={e=>{const a=[...data.products];a[i]={...p,desc:e.target.value};setData({...data,products:a})}}/><input value={p.price} onChange={e=>{const a=[...data.products];a[i]={...p,price:e.target.value};setData({...data,products:a})}}/><button type="button" className="danger" onClick={()=>setData({...data,products:data.products.filter((_,idx)=>idx!==i)})}>刪除</button></div>)}<button type="button" onClick={()=>setData({...data,products:[...data.products,{id:`product-${Date.now()}`,name:"新商品",desc:"商品介紹",price:"價格依尺寸與裝飾確認"}]})}>＋ 新增商品</button></section>
    <button className="primary" onClick={save}>儲存網站設定</button>

    <section><h2>現場銷售與每月營收</h2>
      <p className="privacy">此區只會出現在後台，不會顯示在客人看到的官網。固定小蛋糕只輸入數量；臨時販售的大蛋糕或其他商品可在當天另外新增。</p>
      <div className="revenue-month-row"><label>查看月份<input type="month" value={revenueMonth} onChange={e=>changeRevenueMonth(e.target.value)}/></label><button type="button" onClick={()=>loadSales(password,revenueMonth)} disabled={salesWorking}>重新整理營收</button></div>
      <div className="revenue-cards revenue-cards4"><div><span>官網已付款</span><b>{money(revenueData?.websiteSummary?.revenue)}</b><small>{revenueData?.websiteSummary?.count||0} 筆訂單</small></div><div><span>現場固定商品</span><b>{money(revenueData?.onsiteSummary?.fixedRevenue)}</b><small>{revenueData?.onsiteSummary?.fixedQuantity||0} 個</small></div><div><span>現場其他／大蛋糕</span><b>{money(revenueData?.onsiteSummary?.extraRevenue)}</b><small>{revenueData?.onsiteSummary?.extraQuantity||0} 個</small></div><div className="grand"><span>本月總營業額</span><b>{money(revenueData?.totalRevenue)}</b><small>官網＋全部現場銷售</small></div></div>
      {revenueData?.websiteSummary?.unpriced?.length>0&&<p className="revenue-warning">有 {revenueData.websiteSummary.unpriced.length} 筆已付款官網訂單無法自動辨識價格，未計入官網營收：{revenueData.websiteSummary.unpriced.join("、")}</p>}
      {dailyRevenueRows.length>0&&<details className="monthly-breakdown daily-revenue-overview" open><summary>{revenueMonth} 每日總營收（官網＋現場）</summary>
        <div className="daily-revenue-table"><div className="daily-revenue-header"><span>日期</span><span>官網已付款</span><span>現場銷售</span><span>當日總營收</span></div>
        {dailyRevenueRows.map(day=><details className="daily-revenue-row" key={`revenue-${day.date}`}><summary><span>{day.date.slice(5).replace("-","/")}</span><span>{money(day.websiteRevenue)}<small>{day.websiteCount?`${day.websiteCount} 筆`:""}</small></span><span>{money(day.onsiteRevenue)}</span><b>{money(day.totalRevenue)}</b></summary>
          <div className="daily-revenue-detail">
            {day.websiteOrders.length>0&&<div><strong>官網已付款訂單</strong>{day.websiteOrders.map(order=><p key={order.orderId}><span><b>{order.orderId}</b>｜{order.name||"—"}｜{order.product||"—"}｜{order.size||"—"}<small>付款確認：{formatTaipei(order.paidAt)}；取貨：{order.pickupDate||"—"} {order.pickupTime||""}</small></span><b>{order.amount>0?money(order.amount):"價格未辨識"}</b></p>)}</div>}
            {day.onsiteDay&&<div><strong>現場銷售</strong>{day.onsiteDay.fixedLines.map(line=><p key={`overview-fixed-${day.date}-${line.id}`}><span>{line.name}｜{line.quantity} 個 × {money(line.unitPrice)}</span><b>{money(line.subtotal)}</b></p>)}{day.onsiteDay.extraLines.map(line=><p key={`overview-extra-${day.date}-${line.id}`}><span>{line.name}｜{line.quantity} 個 × {money(line.unitPrice)} <small>（其他／大蛋糕）</small></span><b>{money(line.subtotal)}</b></p>)}</div>}
          </div>
        </details>)}</div>
      </details>}
      <details className="onsite-config"><summary>固定現場商品設定（名稱＋單價只要設定一次）</summary>
        <div className="onsite-products">{onsiteProducts.map((p,i)=><div className="onsite-product-row" key={p.id}><input value={p.name} onChange={e=>{const a=[...onsiteProducts];a[i]={...p,name:e.target.value};setOnsiteProducts(a)}} placeholder="品項名稱"/><input type="number" min="0" value={p.price} onChange={e=>{const a=[...onsiteProducts];a[i]={...p,price:Number(e.target.value||0)};setOnsiteProducts(a)}} placeholder="單價"/><button type="button" className={p.active===false?"":"danger"} onClick={()=>{const a=[...onsiteProducts];a[i]={...p,active:p.active===false};setOnsiteProducts(a)}}>{p.active===false?"恢復販售":"停用品項"}</button></div>)}</div>
        <div className="onsite-config-actions"><button type="button" onClick={()=>setOnsiteProducts([...onsiteProducts,{id:`onsite-${Date.now()}`,name:"",price:0,active:true}])}>＋ 新增現場品項</button><button type="button" className="primary" onClick={saveOnsiteProducts} disabled={salesWorking}>儲存品項設定</button></div>
      </details>
      <div className="daily-sales"><div className="daily-sales-head"><label>銷售日期<input type="date" value={onsiteDate} onChange={e=>changeOnsiteDate(e.target.value)}/></label><div><span>當日現場營業額</span><b>{money(onsiteTodayTotal)}</b><small>固定 {money(fixedTodayTotal)}＋其他 {money(extrasTodayTotal)}</small></div></div>
        {onsiteProducts.filter(p=>p.active!==false).length===0?<p>如果有固定販售的小蛋糕，可先在上方建立品項與單價。</p>:<div className="daily-product-list">{onsiteProducts.filter(p=>p.active!==false).map(p=><label className="daily-product" key={p.id}><span><b>{p.name}</b><small>單價 {money(p.price)}</small></span><input type="number" min="0" step="1" inputMode="numeric" value={onsiteQuantities[p.id]||""} onChange={e=>setOnsiteQuantities({...onsiteQuantities,[p.id]:Math.max(0,Number(e.target.value||0))})} placeholder="0"/><em>{money(Number(onsiteQuantities[p.id]||0)*Number(p.price||0))}</em></label>)}</div>}
        <div className="extra-sales"><div className="extra-sales-head"><div><b>其他／大蛋糕現場銷售</b><small>只有沒有經過官網訂單、直接在現場成交的品項才填這裡，避免重複計算。</small></div><button type="button" onClick={()=>setOnsiteExtras([...onsiteExtras,{id:`extra-${Date.now()}`,name:"",price:0,quantity:1}])}>＋ 新增一筆</button></div>
          {onsiteExtras.length===0?<p className="privacy">今天沒有臨時大蛋糕或其他現場銷售，可不用填。</p>:<div className="extra-list">{onsiteExtras.map((item,i)=><div className="extra-row" key={item.id}><input value={item.name||""} onChange={e=>{const a=[...onsiteExtras];a[i]={...item,name:e.target.value};setOnsiteExtras(a)}} placeholder="例如：水果蛋糕 6 吋"/><input type="number" min="0" value={item.price||""} onChange={e=>{const a=[...onsiteExtras];a[i]={...item,price:Math.max(0,Number(e.target.value||0))};setOnsiteExtras(a)}} placeholder="單價"/><input type="number" min="1" step="1" value={item.quantity||1} onChange={e=>{const a=[...onsiteExtras];a[i]={...item,quantity:Math.max(1,Number(e.target.value||1))};setOnsiteExtras(a)}} placeholder="數量"/><b>{money(Number(item.price||0)*Number(item.quantity||0))}</b><button type="button" className="danger" onClick={()=>setOnsiteExtras(onsiteExtras.filter((_,idx)=>idx!==i))}>刪除</button></div>)}</div>}
        </div>
        <button type="button" className="primary" onClick={saveDailySales} disabled={salesWorking}>儲存這一天的銷售</button>
      </div>
      {revenueData?.onsiteSummary?.byProduct?.length>0&&<details className="monthly-breakdown"><summary>{revenueMonth} 固定商品月累計</summary>{revenueData.onsiteSummary.byProduct.map(p=><p key={p.id}><span>{p.name}｜{p.quantity} 個</span><b>{money(p.revenue)}</b></p>)}</details>}
      {revenueData?.onsiteSummary?.days?.length>0&&<details className="monthly-breakdown daily-history" open><summary>{revenueMonth} 每日銷售明細</summary>{revenueData.onsiteSummary.days.map(day=><details className="day-detail" key={day.date}><summary><span>{day.date}</span><b>{money(day.revenue)}</b></summary><div className="day-lines">{day.fixedLines.map(line=><p key={`fixed-${day.date}-${line.id}`}><span>{line.name}｜{line.quantity} 個 × {money(line.unitPrice)}</span><b>{money(line.subtotal)}</b></p>)}{day.extraLines.map(line=><p key={`extra-${day.date}-${line.id}`}><span>{line.name}｜{line.quantity} 個 × {money(line.unitPrice)} <small>（其他／大蛋糕）</small></span><b>{money(line.subtotal)}</b></p>)}</div></details>)}</details>}
    </section>

    <section><h2>訂單管理</h2>
      <div className="order-stats"><div><b>{stats.today}</b><span>今日訂單</span></div><div><b>{stats.pending}</b><span>🟡 待付款</span></div><div><b>{stats.paid}</b><span>🟢 已付款</span></div><div><b>{stats.cancelled}</b><span>🔴 已取消</span></div></div>
      <div className="toolbar"><button onClick={loadOrders}>讀取訂單</button><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋姓名、電話、LINE、日期或訂單編號"/></div>
      <div className="filters">{statusOptions.map(s=><button key={s} className={filter===s?"on":""} onClick={()=>setFilter(s)}>{s==="全部"?"全部訂單":`${statusIcon[s]} ${s}`}</button>)}</div>
      {filtered.length===0?<p>尚未讀取訂單，或目前沒有符合條件的訂單。</p>:<div className="orders">{filtered.map(o=><article key={o.orderId}>
        <div className="order-head"><div><b>{o.orderId}</b><span className={`badge ${o.status}`}>{statusIcon[o.status]} {o.status}</span></div><span>{o.date} {o.pickupTime}</span></div>
        <p className="order-summary"><strong>{o.name}</strong>｜{o.product}｜{o.size}</p>
        <details className="order-detail"><summary>查看完整訂單內容</summary>
          <div className="detail-grid"><span><b>姓名</b>{o.name||"—"}</span><span><b>電話</b>{o.phone||"—"}</span><span><b>LINE 名稱</b>{o.lineName||"—"}</span><span><b>取貨日期</b>{o.date||"—"}</span><span><b>取貨時間</b>{o.pickupTime||"—"}</span><span><b>用途</b>{o.occasion||"—"}</span><span><b>商品</b>{o.product||"—"}</span><span><b>尺寸</b>{o.size||"—"}</span><span><b>付款方式</b>{o.paymentLabel||"銀行轉帳匯款"}</span></div>
          <p><b>備註：</b>{o.note||"無"}</p><p><b>LINE 綁定：</b>{o.lineUserId?"已綁定，可自動通知客人":"尚未綁定；客人需先在官方 LINE 傳送訂單編號"}</p>
        </details>
        <div className="times"><span>建立時間：{formatTaipei(o.createdAt)}</span><span>付款確認時間：{formatTaipei(o.paymentConfirmedAt)}</span></div>
        <div className="actions"><button className="paid" disabled={working===o.orderId||o.status==="已付款"} onClick={()=>changeStatus(o.orderId,"已付款")}>確認收到款項</button><button className="cancel" disabled={working===o.orderId||o.status==="已取消"} onClick={()=>changeStatus(o.orderId,"已取消")}>取消訂單</button>{o.status!=="待付款"&&<button disabled={working===o.orderId} onClick={()=>changeStatus(o.orderId,"待付款")}>恢復待付款</button>}</div>
      </article>)}</div>}
    </section>
    <p className="status">{msg}</p>
    <style jsx>{`
      .admin{max-width:1000px;margin:auto;padding:42px 20px;font-family:Arial,sans-serif;color:#4b382d}section{background:#fffaf5;border:1px solid #eadbce;border-radius:18px;padding:20px;margin:22px 0}label{display:grid;gap:8px;margin:15px 0}input,textarea,select{padding:12px;border:1px solid #d9c5b4;border-radius:10px;background:white}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}.product-row{display:grid;grid-template-columns:1fr 1.3fr 1fr auto;gap:8px;margin:8px 0}.danger{background:#f6e2de;color:#8f3f34;border:0;border-radius:10px;padding:10px}.privacy{font-size:13px;color:#806c5f}.status{font-weight:700;position:sticky;bottom:12px;background:#fff;padding:12px;border-radius:10px;box-shadow:0 5px 20px #0002}.order-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 18px}.order-stats>div{display:grid;gap:4px;text-align:center;padding:14px 8px;border-radius:12px;background:#f5ece4}.order-stats b{font-size:24px}.order-stats span{font-size:13px;color:#806c5f}.toolbar{display:grid;grid-template-columns:auto 1fr;gap:10px}.toolbar button,.primary,.filters button,.actions button{padding:12px 18px;border:0;border-radius:10px;cursor:pointer}.filters{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.filters button{background:#eee3d8}.filters button.on{background:#6d4939;color:white}.orders{display:grid;gap:12px;margin-top:16px}.orders article{background:white;border:1px solid #eadbce;border-radius:14px;padding:15px}.order-head{display:flex;justify-content:space-between;gap:10px}.order-head>div{display:flex;gap:10px;align-items:center}.badge{font-size:12px;padding:5px 9px;border-radius:999px;background:#f2ece6}.times{display:grid;gap:5px;color:#806c5f;font-size:13px;margin:12px 0}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions .paid{background:#dfeedd;color:#315b35}.actions .cancel{background:#f5dfdc;color:#8b3931}.actions button:disabled{opacity:.45;cursor:not-allowed}.orders p{margin:7px 0}.order-summary{font-size:15px}.order-detail{margin:12px 0;border-top:1px solid #eee0d4;padding-top:10px}.order-detail summary{cursor:pointer;font-weight:700;color:#6d4939}.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.detail-grid span{display:grid;gap:3px;padding:10px;border-radius:10px;background:#faf4ee;font-size:13px}.detail-grid b{font-size:12px;color:#806c5f}.calendar-help{font-size:13px;color:#806c5f;margin:-6px 0 12px}.calendar-save{padding:11px 16px;border:0;border-radius:10px;background:#6d4939;color:#fff;cursor:pointer}.closed-date-list{margin:16px 0 22px;padding:14px;border-radius:12px;background:#faf4ee}.closed-date-list>p{margin:10px 0 0;color:#806c5f}.closed-date-item{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid #eadbce}.closed-date-item:last-child{border-bottom:0}.closed-date-item button{border:0;border-radius:9px;padding:7px 12px;background:#f5dfdc;color:#8b3931;cursor:pointer}.revenue-month-row{display:flex;align-items:end;gap:10px;flex-wrap:wrap}.revenue-month-row label{margin:0}.revenue-month-row button,.onsite-config-actions button{padding:11px 15px;border:0;border-radius:10px;cursor:pointer}.revenue-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:18px 0}.revenue-cards4{grid-template-columns:repeat(4,1fr)}.revenue-cards>div{display:grid;gap:5px;padding:16px;border-radius:14px;background:#f5ece4}.revenue-cards .grand{background:#6d4939;color:white}.revenue-cards b{font-size:25px}.revenue-cards small{opacity:.75}.revenue-warning{padding:11px 13px;border-radius:10px;background:#fff3cf;color:#775b18;font-size:13px}.onsite-config{border-top:1px solid #eadbce;border-bottom:1px solid #eadbce;padding:13px 0;margin:15px 0}.onsite-config summary,.monthly-breakdown summary{cursor:pointer;font-weight:700}.onsite-products{display:grid;gap:8px;margin:12px 0}.onsite-product-row{display:grid;grid-template-columns:1.5fr .7fr auto;gap:8px}.onsite-config-actions{display:flex;gap:8px;flex-wrap:wrap}.daily-sales{margin-top:18px;padding:16px;border-radius:14px;background:#faf4ee}.daily-sales-head{display:flex;justify-content:space-between;align-items:end;gap:15px}.daily-sales-head label{margin:0}.daily-sales-head>div{display:grid;text-align:right;gap:3px}.daily-sales-head b{font-size:24px}.daily-product-list{display:grid;gap:8px;margin:16px 0}.daily-product{display:grid;grid-template-columns:1fr 100px 120px;align-items:center;gap:10px;margin:0;padding:11px;border-radius:10px;background:white}.daily-product span{display:grid;gap:3px}.daily-product small{color:#806c5f}.daily-product input{text-align:center}.daily-product em{text-align:right;font-style:normal;font-weight:700}.monthly-breakdown{margin-top:15px}.monthly-breakdown p{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #eadbce}.monthly-breakdown p:last-child{border-bottom:0}.extra-sales{margin:18px 0;padding-top:16px;border-top:1px dashed #d9c5b4}.extra-sales-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.extra-sales-head>div{display:grid;gap:4px}.extra-sales-head small{color:#806c5f}.extra-sales-head button{padding:9px 12px;border:0;border-radius:9px;cursor:pointer}.extra-list{display:grid;gap:8px;margin:12px 0}.extra-row{display:grid;grid-template-columns:1.5fr .7fr .55fr 110px auto;gap:8px;align-items:center}.extra-row b{text-align:right}.day-detail{margin:10px 0;padding:10px 12px;border-radius:10px;background:#faf4ee}.day-detail>summary{display:flex;justify-content:space-between;gap:12px;cursor:pointer;font-weight:700}.day-lines{margin-top:8px;padding-left:10px}.day-lines small{color:#806c5f}.daily-revenue-overview{margin-top:18px}.daily-revenue-table{display:grid;gap:7px;margin-top:12px}.daily-revenue-header,.daily-revenue-row>summary{display:grid;grid-template-columns:.7fr 1fr 1fr 1fr;gap:10px;align-items:center}.daily-revenue-header{padding:0 12px 5px;color:#806c5f;font-size:12px}.daily-revenue-row{padding:0;border-radius:11px;background:#faf4ee}.daily-revenue-row>summary{cursor:pointer;padding:12px;font-weight:700}.daily-revenue-row>summary span{display:grid;gap:2px}.daily-revenue-row>summary small{font-weight:400;color:#806c5f}.daily-revenue-detail{display:grid;gap:14px;padding:0 12px 12px}.daily-revenue-detail>div{padding-top:10px;border-top:1px solid #eadbce}.daily-revenue-detail p{display:flex;justify-content:space-between;gap:14px;padding:8px 0;margin:0;border-bottom:1px solid #eadbce}.daily-revenue-detail p:last-child{border-bottom:0}.daily-revenue-detail p span{display:grid;gap:4px}.daily-revenue-detail p small{color:#806c5f;font-size:12px}@media(max-width:700px){.grid3,.toolbar,.product-row,.order-stats,.detail-grid,.revenue-cards,.revenue-cards4,.onsite-product-row,.extra-row{grid-template-columns:1fr}.order-head{display:grid}.actions button{width:100%}.daily-sales-head{display:grid;align-items:stretch}.daily-sales-head>div{text-align:left}.daily-product{grid-template-columns:1fr 80px}.daily-product em{grid-column:1/-1;text-align:left}.revenue-month-row>*{width:100%}.daily-revenue-header{display:none}.daily-revenue-row>summary{grid-template-columns:1fr 1fr}.daily-revenue-row>summary b{text-align:right}.daily-revenue-detail p{display:grid}}
    `}</style>
  </main>
}
