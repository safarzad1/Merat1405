"use client";
import { useEffect, useState } from "react";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import s from "./Consolidation.module.css";
import SummaryAttachmentsPanel from "./SummaryAttachmentsPanel";
const toText = (value: unknown) => value == null ? "—" : String(value);
export default function HozeSummaryEditor({ referralId, working, onReadyChange }: {
 referralId: number; working: boolean; onReadyChange:(ready:boolean)=>void;
}) {
 const [rows,setRows]=useState<V2Row[]>([]),[text,setText]=useState(""),[saved,setSaved]=useState("");
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [summaryId,setSummaryId]=useState<number|null>(null);
 useEffect(()=>{let live=true;onReadyChange(false);setLoading(true);setRows([]);setText("");setSaved("");setSummaryId(null);setError("");setNotice("");
  void meratV2Request(`/Api/TahghighV2/HozeConsolidation?hozeReferralId=${referralId}`)
  .then(items=>{if(!live)return;const v=typeof items[0]?.HozeSummaryText==="string"?String(items[0].HozeSummaryText):"";
   const id=Number(items[0]?.HozeSummaryId??0);setSummaryId(Number.isSafeInteger(id)&&id>0?id:null);
   setRows(items);setText(v);setSaved(v);onReadyChange(v.trim().length>=20);})
  .catch(e=>{if(live)setError(e instanceof Error?e.message:String(e));})
  .finally(()=>{if(live)setLoading(false);});return ()=>{live=false;};
 },[referralId,onReadyChange]);
 async function save(){setSaving(true);setError("");setNotice("");onReadyChange(false);
  try{const result=await meratV2Request("/Api/TahghighV2/SaveHozeSummary",{hozeReferralId:referralId,summaryText:text.trim()});
   const id=Number(result[0]?.SummaryId??0);if(Number.isSafeInteger(id)&&id>0)setSummaryId(id);
   setSaved(text.trim());setText(text.trim());onReadyChange(true);setNotice("جمع‌بندی حوزه اصلی ذخیره شد.");}
  catch(e){setError(e instanceof Error?e.message:String(e));}finally{setSaving(false);}}
 const clean=text.trim(),unchanged=clean===saved.trim();
 return <section className={s.panel} aria-label="جمع‌بندی حوزه">
  <h3 className={s.heading}>تجمیع نتیجه شهرستان‌ها و جمع‌بندی حوزه اصلی</h3>
  <p className={s.help}>نتایج ثبت‌شده شهرستان‌های تابع را بخوانید. پرونده دارای شهرستان باز، حتی با جمع‌بندی ذخیره‌شده، قابل ارسال به استان نیست.</p>
  {loading?<p role="status">در حال دریافت نتایج شهرستان‌ها…</p>:<>
   <div className={s.tableWrap}><table className={s.table}><thead><tr><th>شهرستان</th><th>وضعیت</th><th>تحقیقات باز</th><th>جمع‌بندی شهرستان</th></tr></thead><tbody>
    {rows.filter(r=>r.CountyReferralId!=null).map(r=><tr key={toText(r.CountyReferralId)}><td>{toText(r.CountyName ?? r.CountyCityId)}</td>
     <td>{toText(r.CountyState)}</td><td>{toText(r.OpenAssignments)}</td><td><p className={s.pre}>{toText(r.CountySummaryText)}</p>{Number(r.CountySummaryId)>0&&<SummaryAttachmentsPanel level="COUNTY" summaryRecordId={Number(r.CountySummaryId)} readOnly/>}</td></tr>)}
    {rows.every(r=>r.CountyReferralId==null)&&<tr><td colSpan={4}>هنوز شهرستان تابعی ارجاع نشده است.</td></tr>}
   </tbody></table></div>
   <label htmlFor={`hoze-summary-${referralId}`} className={s.label}>متن جمع‌بندی حوزه اصلی</label>
   <textarea id={`hoze-summary-${referralId}`} className={s.textarea} maxLength={10000} value={text}
    readOnly={!working||saving} onChange={e=>{setText(e.target.value);onReadyChange(false);setNotice("");}}
    placeholder="نتیجه ارزیابی پاسخ شهرستان‌ها و تصمیم حوزه اصلی را بنویسید…"/>
   <div className={s.actions}><span className={s.meta}>{clean.length.toLocaleString("fa-IR")} / ۱۰٬۰۰۰ نویسه</span>
    <button type="button" className={s.button} disabled={!working||saving||clean.length<20||unchanged} onClick={()=>void save()}>{saving?"در حال ذخیره…":"ذخیره جمع‌بندی حوزه"}</button></div>
   {saved.trim().length>=20&&unchanged&&<p role="status" className={s.success}>جمع‌بندی حوزه ذخیره شده است.</p>}
   {!unchanged&&<p className={s.warning}>ویرایش جدید ذخیره نشده است.</p>}
  </>}
  {summaryId!==null&&<SummaryAttachmentsPanel level="HOZE" summaryRecordId={summaryId} readOnly={!working||saving}/>}
  {notice&&<p role="status" className={s.success}>{notice}</p>}
  {error&&<p role="alert" className={s.warning}>{error}</p>}
 </section>;
}
