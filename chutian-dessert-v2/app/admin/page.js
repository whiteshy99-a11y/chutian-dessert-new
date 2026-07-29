"use client";
import { useEffect, useState } from "react";

export default function Admin(){
  const [password,setPassword]=useState("");
  const [data,setData]=useState(null);
  const [msg,setMsg]=useState("");

  useEffect(()=>{fetch("/api/settings").then(r=>r.json()).then(setData)},[]);
  if(!data) return <main style={{padding:40}}>載入中…</main>;

  const updateList=(key,value)=>setData({...data,[key]:value.split(/\s*,\s*|\n+/).filter(Boolean)});
  async function save(){
    setMsg("儲存中…");
    const r=await fetch("/api/admin/settings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({password,settings:data})});
    const j=await r.json(); setMsg(r.ok?"已儲存並同步到網站。":j.error||"儲存失敗");
  }
  return <main className="admin">
    <h1>初甜趣網站後台</h1>
    <p>滿單與剩少量日期請使用 YYYY-MM-DD，一行一個或用逗號分隔。</p>
    <label>後台密碼<input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></label>
    <label>滿單日期<textarea rows="8" value={data.closedDates.join("\n")} onChange={e=>updateList("closedDates",e.target.value)}/></label>
    <label>剩少量日期<textarea rows="6" value={data.limitedDates.join("\n")} onChange={e=>updateList("limitedDates",e.target.value)}/></label>
    <h2>商品</h2>
    {data.products.map((p,i)=><div className="admin-product" key={p.id}>
      <input value={p.name} onChange={e=>{const a=[...data.products];a[i]={...p,name:e.target.value};setData({...data,products:a})}}/>
      <input value={p.desc} onChange={e=>{const a=[...data.products];a[i]={...p,desc:e.target.value};setData({...data,products:a})}}/>
      <input value={p.price} onChange={e=>{const a=[...data.products];a[i]={...p,price:e.target.value};setData({...data,products:a})}}/>
    </div>)}
    <button className="primary" onClick={save}>儲存設定</button>
    <p>{msg}</p>
    <style jsx>{`
      .admin{max-width:850px;margin:auto;padding:50px 20px;font-family:Arial,sans-serif}
      label{display:grid;gap:8px;margin:18px 0}input,textarea{padding:12px;border:1px solid #ccc}
      .admin-product{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}
      @media(max-width:700px){.admin-product{grid-template-columns:1fr}}
    `}</style>
  </main>
}
