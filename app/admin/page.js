"use client";
import { useEffect, useMemo, useState } from "react";

const statusOptions=["全部","待付款","已付款","已取消"];
const statusIcon={"待付款":"🟡","已付款":"🟢","已取消":"🔴"};
function formatTaipei(value){if(!value)return "—";try{return new Intl.DateTimeFormat("zh-TW",{timeZone:"Asia/Taipei",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(value))}catch{return value}}

export default function Admin(){
  const [password,setPassword]=useState("");
  const [data,setData]=useState(null);
  const [orders,setOrders]=useState([]);
  const [query,setQuery]=useState("");
  const [filter,setFilter]=useState("全部");
  const [msg,setMsg]=useState("");
  const [working,setWorking]=useState("");

  useEffect(()=>{fetch("/api/settings").then(r=>r.json()).then(setData)},[]);
  const updateList=(key,value)=>setData({...data,[key]:value.split(/\s*,\s*|\n+/).filter(Boolean)});
  const updateField=(key,value)=>setData({...data,[key]:value});
  async function save(){setMsg("儲存中…");const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,settings:data})});const j=await r.json();setMsg(r.ok?"已儲存並同步到網站。":j.error||"儲存失敗");}
  async function loadOrders(){setMsg("讀取訂單中…");const r=await fetch("/api/admin/orders",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password})});const j=await r.json();if(r.ok){setOrders(j.orders||[]);setMsg(`已讀取 ${j.orders?.length||0} 筆訂單。`)}else setMsg(j.error||"讀取失敗");}
  async function changeStatus(orderId,status){
    setWorking(orderId);setMsg("更新訂單中…");
    const r=await fetch("/api/admin/order-status",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,orderId,status})});
    const j=await r.json();
    if(r.ok){setOrders(current=>current.map(o=>o.orderId===orderId?j.order:o));setMsg(j.notification?.sent?`已更新為「${status}」，並已透過 LINE 通知客人。`:`已更新為「${status}」。${j.notification?.reason?`（${j.notification.reason}）`:""}`)}else setMsg(j.error||"更新失敗");
    setWorking("");
  }
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
  if(!data)return <main style={{padding:40}}>載入中…</main>;

  return <main className="admin">
    <h1>初甜趣網站後台</h1>
    <label>後台密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <section><h2>首頁與客服</h2><label>首頁公告<input value={data.announcement||""} onChange={e=>updateField("announcement",e.target.value)} placeholder="例如：父親節檔期已滿單"/></label><label>LINE 官方帳號連結<input value={data.lineUrl||""} onChange={e=>updateField("lineUrl",e.target.value)} placeholder="https://lin.ee/xxxxxxx"/></label><label>客服回覆時間<input value={data.serviceHours||""} onChange={e=>updateField("serviceHours",e.target.value)}/></label><label>Google 地圖連結<input value={data.mapUrl||""} onChange={e=>updateField("mapUrl",e.target.value)}/></label><label>Google 評論連結<input value={data.reviewUrl||""} onChange={e=>updateField("reviewUrl",e.target.value)}/></label></section>
    <section><h2>匯款資訊</h2><div className="grid3"><input value={data.bankName||""} onChange={e=>updateField("bankName",e.target.value)} placeholder="銀行名稱"/><input value={data.bankCode||""} onChange={e=>updateField("bankCode",e.target.value)} placeholder="銀行代碼"/><input value={data.bankAccount||""} onChange={e=>updateField("bankAccount",e.target.value)} placeholder="匯款帳號"/></div><label>匯款提醒<textarea rows="3" value={data.bankNote||""} onChange={e=>updateField("bankNote",e.target.value)}/></label><p className="privacy">網站不顯示戶名；訂單不設定匯款期限，也不會自動取消。</p></section>
    <section><h2>行事曆</h2><label>滿單日期<textarea rows="7" value={data.closedDates.join("\n")} onChange={e=>updateList("closedDates",e.target.value)}/></label><label>剩少量日期<textarea rows="5" value={data.limitedDates.join("\n")} onChange={e=>updateList("limitedDates",e.target.value)}/></label></section>
    <section><h2>商品</h2>{data.products.map((p,i)=><div className="product-row" key={p.id}><input value={p.name} onChange={e=>{const a=[...data.products];a[i]={...p,name:e.target.value};setData({...data,products:a})}}/><input value={p.desc} onChange={e=>{const a=[...data.products];a[i]={...p,desc:e.target.value};setData({...data,products:a})}}/><input value={p.price} onChange={e=>{const a=[...data.products];a[i]={...p,price:e.target.value};setData({...data,products:a})}}/><button type="button" className="danger" onClick={()=>setData({...data,products:data.products.filter((_,idx)=>idx!==i)})}>刪除</button></div>)}<button type="button" onClick={()=>setData({...data,products:[...data.products,{id:`product-${Date.now()}`,name:"新商品",desc:"商品介紹",price:"價格依尺寸與裝飾確認"}]})}>＋ 新增商品</button></section>
    <button className="primary" onClick={save}>儲存網站設定</button>

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
      .admin{max-width:1000px;margin:auto;padding:42px 20px;font-family:Arial,sans-serif;color:#4b382d}section{background:#fffaf5;border:1px solid #eadbce;border-radius:18px;padding:20px;margin:22px 0}label{display:grid;gap:8px;margin:15px 0}input,textarea,select{padding:12px;border:1px solid #d9c5b4;border-radius:10px;background:white}.grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}.product-row{display:grid;grid-template-columns:1fr 1.3fr 1fr auto;gap:8px;margin:8px 0}.danger{background:#f6e2de;color:#8f3f34;border:0;border-radius:10px;padding:10px}.privacy{font-size:13px;color:#806c5f}.status{font-weight:700;position:sticky;bottom:12px;background:#fff;padding:12px;border-radius:10px;box-shadow:0 5px 20px #0002}.order-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:14px 0 18px}.order-stats>div{display:grid;gap:4px;text-align:center;padding:14px 8px;border-radius:12px;background:#f5ece4}.order-stats b{font-size:24px}.order-stats span{font-size:13px;color:#806c5f}.toolbar{display:grid;grid-template-columns:auto 1fr;gap:10px}.toolbar button,.primary,.filters button,.actions button{padding:12px 18px;border:0;border-radius:10px;cursor:pointer}.filters{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0}.filters button{background:#eee3d8}.filters button.on{background:#6d4939;color:white}.orders{display:grid;gap:12px;margin-top:16px}.orders article{background:white;border:1px solid #eadbce;border-radius:14px;padding:15px}.order-head{display:flex;justify-content:space-between;gap:10px}.order-head>div{display:flex;gap:10px;align-items:center}.badge{font-size:12px;padding:5px 9px;border-radius:999px;background:#f2ece6}.times{display:grid;gap:5px;color:#806c5f;font-size:13px;margin:12px 0}.actions{display:flex;gap:8px;flex-wrap:wrap}.actions .paid{background:#dfeedd;color:#315b35}.actions .cancel{background:#f5dfdc;color:#8b3931}.actions button:disabled{opacity:.45;cursor:not-allowed}.orders p{margin:7px 0}.order-summary{font-size:15px}.order-detail{margin:12px 0;border-top:1px solid #eee0d4;padding-top:10px}.order-detail summary{cursor:pointer;font-weight:700;color:#6d4939}.detail-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:12px 0}.detail-grid span{display:grid;gap:3px;padding:10px;border-radius:10px;background:#faf4ee;font-size:13px}.detail-grid b{font-size:12px;color:#806c5f}@media(max-width:700px){.grid3,.toolbar,.product-row,.order-stats,.detail-grid{grid-template-columns:1fr}.order-head{display:grid}.actions button{width:100%}}
    `}</style>
  </main>
}
