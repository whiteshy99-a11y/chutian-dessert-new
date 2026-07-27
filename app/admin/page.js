"use client";
import { useEffect, useMemo, useState } from "react";

const statuses=["待確認","待匯款","已付款","製作中","已完成","已取貨","已取消"];

export default function Admin(){
  const [password,setPassword]=useState("");
  const [data,setData]=useState(null);
  const [orders,setOrders]=useState([]);
  const [query,setQuery]=useState("");
  const [msg,setMsg]=useState("");

  useEffect(()=>{fetch("/api/settings").then(r=>r.json()).then(setData)},[]);
  const updateList=(key,value)=>setData({...data,[key]:value.split(/\s*,\s*|\n+/).filter(Boolean)});
  const updateField=(key,value)=>setData({...data,[key]:value});

  async function save(){
    setMsg("儲存中…");
    const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,settings:data})});
    const j=await r.json(); setMsg(r.ok?"已儲存並同步到網站。":j.error||"儲存失敗");
  }
  async function loadOrders(){
    setMsg("讀取訂單中…");
    const r=await fetch("/api/admin/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});
    const j=await r.json();
    if(r.ok){setOrders(j.orders||[]);setMsg(`已讀取 ${j.orders?.length||0} 筆訂單。`)} else setMsg(j.error||"讀取失敗");
  }
  async function changeStatus(orderId,status){
    const r=await fetch("/api/admin/order-status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,orderId,status})});
    const j=await r.json();
    if(r.ok)setOrders(orders.map(o=>o.orderId===orderId?j.order:o));else setMsg(j.error||"更新失敗");
  }
  const filtered=useMemo(()=>orders.filter(o=>[o.orderId,o.name,o.phone,o.date,o.product].join(" ").toLowerCase().includes(query.toLowerCase())),[orders,query]);
  if(!data) return <main style={{padding:40}}>載入中…</main>;

  return <main className="admin">
    <h1>初甜趣網站後台</h1>
    <label>後台密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>

    <section><h2>首頁與客服</h2>
      <label>首頁公告<input value={data.announcement||""} onChange={e=>updateField("announcement",e.target.value)} placeholder="例如：父親節檔期已滿單"/></label>
      <label>LINE 官方帳號連結<input value={data.lineUrl||""} onChange={e=>updateField("lineUrl",e.target.value)} placeholder="https://lin.ee/xxxxxxx"/></label>
      <label>客服回覆時間<input value={data.serviceHours||""} onChange={e=>updateField("serviceHours",e.target.value)}/></label>
      <label>Google 地圖連結<input value={data.mapUrl||""} onChange={e=>updateField("mapUrl",e.target.value)} placeholder="Google Maps 分享連結"/></label>
      <label>Google 評論連結<input value={data.reviewUrl||""} onChange={e=>updateField("reviewUrl",e.target.value)} placeholder="Google 評論頁連結"/></label>
    </section>

    <section><h2>匯款資訊</h2>
      <div className="grid3"><input value={data.bankName||""} onChange={e=>updateField("bankName",e.target.value)} placeholder="銀行名稱"/><input value={data.bankCode||""} onChange={e=>updateField("bankCode",e.target.value)} placeholder="銀行代碼"/><input value={data.bankAccount||""} onChange={e=>updateField("bankAccount",e.target.value)} placeholder="匯款帳號"/></div>
      <label>匯款提醒<textarea rows="3" value={data.bankNote||""} onChange={e=>updateField("bankNote",e.target.value)}/></label>
      <p className="privacy">網站不顯示戶名。</p>
    </section>

    <section><h2>行事曆</h2>
      <label>滿單日期<textarea rows="7" value={data.closedDates.join("\n")} onChange={e=>updateList("closedDates",e.target.value)}/></label>
      <label>剩少量日期<textarea rows="5" value={data.limitedDates.join("\n")} onChange={e=>updateList("limitedDates",e.target.value)}/></label>
    </section>

    <section><h2>商品</h2>{data.products.map((p,i)=><div className="product-row" key={p.id}>
      <input value={p.name} onChange={e=>{const a=[...data.products];a[i]={...p,name:e.target.value};setData({...data,products:a})}} placeholder="商品名稱"/>
      <input value={p.desc} onChange={e=>{const a=[...data.products];a[i]={...p,desc:e.target.value};setData({...data,products:a})}} placeholder="商品介紹"/>
      <input value={p.price} onChange={e=>{const a=[...data.products];a[i]={...p,price:e.target.value};setData({...data,products:a})}} placeholder="價格說明"/>
      <button type="button" className="danger" onClick={()=>setData({...data,products:data.products.filter((_,idx)=>idx!==i)})}>刪除</button>
    </div>)}<button type="button" onClick={()=>setData({...data,products:[...data.products,{id:`product-${Date.now()}`,name:"新商品",desc:"商品介紹",price:"價格依尺寸與裝飾確認"}]})}>＋ 新增商品</button></section>
    <button className="primary" onClick={save}>儲存網站設定</button>

    <section><h2>訂單管理</h2>
      <div className="toolbar"><button onClick={loadOrders}>讀取訂單</button><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜尋姓名、電話、日期或訂單編號"/></div>
      {filtered.length===0?<p>尚未讀取訂單，或目前沒有訂單。</p>:<div className="orders">{filtered.map(o=><article key={o.orderId}>
        <div><b>{o.orderId}</b><span>{o.date} {o.pickupTime}</span></div>
        <p>{o.name}｜{o.phone}</p><p>{o.product}｜{o.size}｜{o.paymentLabel}</p>{o.note&&<p>備註：{o.note}</p>}
        <select value={o.status} onChange={e=>changeStatus(o.orderId,e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select>
      </article>)}</div>}
    </section>
    <p className="status">{msg}</p>
    <style jsx>{`
      .admin{max-width:1000px;margin:auto;padding:42px 20px;font-family:Arial,sans-serif;color:#4b382d}section{background:#fffaf5;border:1px solid #eadbce;border-radius:18px;padding:20px;margin:22px 0}label{display:grid;gap:8px;margin:15px 0}input,textarea,select{padding:12px;border:1px solid #d9c5b4;border-radius:10px;background:white}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}.product-row{display:grid;grid-template-columns:1fr 1.3fr 1fr auto;gap:8px;margin:8px 0}.danger{background:#f6e2de;color:#8f3f34;border:0;border-radius:10px;padding:10px}.privacy{font-size:13px;color:#806c5f}.status{font-weight:700}.toolbar{display:grid;grid-template-columns:auto 1fr;gap:10px}.toolbar button,.primary{padding:12px 18px;border:0;border-radius:10px;cursor:pointer}.orders{display:grid;gap:12px;margin-top:16px}.orders article{background:white;border:1px solid #eadbce;border-radius:14px;padding:15px}.orders article>div{display:flex;justify-content:space-between;gap:10px}.orders p{margin:7px 0}@media(max-width:700px){.grid3,.toolbar,.product-row{grid-template-columns:1fr}.orders article>div{display:grid}}
    `}</style>
  </main>
}
