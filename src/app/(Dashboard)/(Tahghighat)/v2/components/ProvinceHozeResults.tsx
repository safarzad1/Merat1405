"use client";
import { useEffect, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import s from "./Consolidation.module.css";
import SummaryAttachmentsPanel from "./SummaryAttachmentsPanel";
const txt=(v:unknown)=>v==null?"—":String(v);
export default function ProvinceHozeResults({ parentReferralId }:{parentReferralId:number}){
 const [rows,setRows]=useState<V2Row[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let live=true;setLoading(true);setRows([]);setError("");
 void meratV2Request(`/Api/TahghighV2/ProvinceHozeConsolidation?parentReferralId=${parentReferralId}`)
 .then(v=>{if(live)setRows(v);}).catch(e=>{if(live)setError(e instanceof Error?e.message:String(e));})
 .finally(()=>{if(live)setLoading(false);});return()=>{live=false;};},[parentReferralId]);
 return <section className={s.panel} aria-label="نتایج حوزه‌های اصلی">
  <h3 className={s.heading}>نتایج تجمیع‌شده حوزه‌های اصلی</h3>
  <p className={s.help}>متن جمع‌بندی ثبت‌شده هر حوزه و وضعیت شهرستان‌های تابع برای بررسی استان نمایش داده می‌شود.</p>
  {loading?<p role="status">در حال دریافت…</p>:rows.length===0?<p>برای این پرونده، ارجاع حوزه اصلی ثبت نشده است.</p>:
  <div className={s.cardGrid}>{rows.map(r=><article className={s.card} key={txt(r.HozeReferralId)}>
   <strong>حوزه {txt(r.HozeCityId)} — ارجاع {txt(r.HozeReferralId)}</strong>
   <p><span className={r.IsClosed? s.stateGood:s.stateBad}>{r.IsClosed?"پاسخ ثبت شده":"در جریان"}</span></p>
   <p className={s.meta}>شهرستان‌های تابع: {txt(r.CountyCount)} | باز: {txt(r.OpenCounties)}</p>
   <p className={s.pre}>{txt(r.HozeSummaryText)}</p>{Number(r.HozeSummaryId)>0&&<SummaryAttachmentsPanel level="HOZE" summaryRecordId={Number(r.HozeSummaryId)} readOnly/>}
  </article>)}</div>}
  {error&&<p role="alert" className={s.warning}>{error}</p>}
 </section>;
}
