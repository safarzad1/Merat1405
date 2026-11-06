"use client";
import { useState } from "react";
import { meratV2Request } from "@/app/lib/meratV2/client";

type Props = { parentReferralId: number; childReferralId: number; destination: string; onClose: () => void; onReturned: () => void };
export default function ReturnReferralModal({ parentReferralId, childReferralId, destination, onClose, onReturned }: Props) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy || reason.trim().length < 5) return;
    setBusy(true); setError("");
    try {
      await meratV2Request("/Api/TahghighV2/ReturnChildForRevision", {
        parentReferralId, childReferralId, reason: reason.trim(),
      });
      onReturned();
    } catch (err) { setError(err instanceof Error ? err.message : "ثبت برگشت انجام نشد."); }
    finally { setBusy(false); }
  }
  return <div role="presentation" style={{position:"fixed",inset:0,zIndex:10040,background:"rgba(13,25,51,.57)",display:"grid",placeItems:"center",padding:12}} dir="rtl">
    <section role="dialog" aria-modal="true" aria-labelledby="return-title" style={{width:"min(580px,100%)",background:"white",borderRadius:17,boxShadow:"0 20px 80px #10274840",overflow:"hidden"}}>
      <header style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,padding:"16px 20px",background:"#f5f5ff",borderBottom:"1px solid #e2e4fa"}}>
        <div><h2 id="return-title" style={{fontSize:17,margin:0,color:"#223662"}}>برگشت برای اصلاح</h2><div style={{marginTop:5,fontSize:12,color:"#637496"}}>مقصد: {destination}</div></div>
        <button type="button" disabled={busy} onClick={onClose} style={{border:"1px solid #d9e1ef",borderRadius:9,background:"white",padding:"9px 12px",cursor:"pointer"}}>بستن</button>
      </header>
      <div style={{padding:20}}>
        <label htmlFor="return-reason" style={{display:"block",fontWeight:700,color:"#2a3c5b",marginBottom:10}}>دلیل و توضیحات برگشت <span style={{color:"#cf3333"}}>*</span></label>
        <textarea id="return-reason" rows={6} maxLength={4000} autoFocus value={reason} onChange={e=>setReason(e.target.value)}
          placeholder="مواردی را که مقصد باید بررسی یا اصلاح کند، دقیق بنویسید…"
          style={{width:"100%",boxSizing:"border-box",resize:"vertical",border:"1px solid #cbd8ed",borderRadius:12,padding:14,fontFamily:"inherit",lineHeight:2,fontSize:14,color:"#26385b"}}/>
        <div style={{fontSize:12,color:"#6b7791",marginTop:7}}>توضیحات در سابقه پرونده ثبت و به مقصد نمایش داده می‌شود. گزارش و پیوست‌های قبلی حذف نمی‌شوند.</div>
        {error && <div role="alert" style={{color:"#aa2735",background:"#fff2f2",padding:10,borderRadius:8,marginTop:12}}>{error}</div>}
      </div>
      <footer style={{display:"flex",justifyContent:"flex-start",gap:9,padding:"12px 20px",borderTop:"1px solid #ebedf6"}}>
        <button type="button" disabled={busy||reason.trim().length<5} onClick={()=>void submit()}
          style={{border:0,borderRadius:9,padding:"11px 18px",color:"#533900",background:busy?"#e8e2d2":"#f8cb64",cursor:busy?"wait":"pointer",fontWeight:700}}>ثبت برگشت و ارسال به پیشخوان مقصد</button>
        <button type="button" disabled={busy} onClick={onClose} style={{border:"1px solid #d4dfee",borderRadius:9,padding:"10px 18px",background:"#fff",cursor:"pointer"}}>انصراف</button>
      </footer>
    </section>
  </div>;
}
