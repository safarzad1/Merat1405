"use client";
/* County summary uses the same printable form and image-rendering workflow as
   the investigator summaries in province and hoze. Saves still go through the
   existing scoped SaveCountySummary API, not through investigator endpoints. */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import domtoimage from "@/lib/domToImageCompat";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import { InvestigatorSummarySheet, type SummaryIdentity, type SummaryWorksheet } from "./InvestigatorSummarySheet";
import { meratConfirm } from "@/component/MeratFeedback/feedback";
import SummaryAttachmentsPanel from "./SummaryAttachmentsPanel";
import summaryStyles from "./ProvinceInvestigatorEvidence.module.css";
import s from "./Consolidation.module.css";

type Attachment = { AttachmentId:string; OriginalFileName:string; MimeType:string };
type ApiAnswer<T> = { ok:boolean;data?:T;message?:string;code?:string };
const asText=(value:unknown)=>value==null?"—":String(value);
const toId=(value:unknown)=>{const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null;};
const MAX_BYTES=3*1024*1024;

async function attachments(summaryId:number):Promise<Attachment[]> {
 const response=await fetch(`/Api/TahghighV2/DocumentAttachments?targetEntity=COUNTY_SUMMARY&targetRecordId=${summaryId}`,{cache:"no-store",credentials:"same-origin"});
 const json=await response.json() as ApiAnswer<Attachment[]>;
 if(!response.ok||!json.ok)throw new Error(json.message||"دریافت اسناد جمع‌بندی انجام نشد.");
 return json.data||[];
}
async function upload(summaryId:number,file:File):Promise<void> {
 const form=new FormData();
 form.set("targetEntity","COUNTY_SUMMARY");form.set("targetRecordId",String(summaryId));form.set("file",file);
 const response=await fetch("/Api/TahghighV2/DocumentAttachments",{method:"POST",credentials:"same-origin",body:form});
 const json=await response.json() as ApiAnswer<unknown>;
 if(!response.ok||!json.ok)throw new Error(json.message||"ثبت تصویر جمع‌بندی شهرستان انجام نشد.");
}
async function deleteOldImage(id:string):Promise<void> {
 const response=await fetch(`/Api/TahghighV2/DocumentAttachmentFile?attachmentId=${encodeURIComponent(id)}`,{
  method:"DELETE",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:"{}"
 });
 const json=await response.json() as ApiAnswer<unknown>;
 if(!response.ok||!json.ok)throw new Error(json.message||"حذف منطقی تصویر قدیمی انجام نشد.");
}

export default function CountySummaryEditor({referralId,working,identity,countyName,onReadyChange,onClose}: {
 referralId:number;working:boolean;identity:SummaryIdentity;countyName:string;
 onReadyChange:(ready:boolean)=>void;onClose:()=>void;
}) {
 const [rows,setRows]=useState<V2Row[]>([]);
 const [worksheets,setWorksheets]=useState<SummaryWorksheet[]>([]);
 const [worksheetWarning,setWorksheetWarning]=useState("");
 const [text,setText]=useState("");const [saved,setSaved]=useState("");
 const [summaryId,setSummaryId]=useState<number|null>(null);
 const [loading,setLoading]=useState(true);const [saving,setSaving]=useState(false);
 const [error,setError]=useState("");const [notice,setNotice]=useState("");
 const [imagePending,setImagePending]=useState(false);const [refresh,setRefresh]=useState(0);
 const captureRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  let active=true;
  onReadyChange(false);setLoading(true);setRows([]);setWorksheets([]);
  setText("");setSaved("");setSummaryId(null);setError("");setNotice("");
  void (async()=>{
    try {
      const items=await meratV2Request(`/Api/TahghighV2/CountyConsolidation?countyReferralId=${referralId}`);
      if(!active)return;
      if(items.length===0)throw new Error("ارجاع شهرستان در فهرست جمع‌بندی یافت نشد؛ ثبت جمع‌بندی بدون پرونده مجاز نیست.");
      const value=typeof items[0]?.CountySummaryText==="string"?String(items[0].CountySummaryText):"";
      setRows(items);setText(value);setSaved(value);setSummaryId(toId(items[0]?.SummaryId));
      onReadyChange(value.trim().length>=20);
      const ids=[...new Set(items.map(item=>toId(item.AssignmentId)).filter((id):id is number=>id!==null))];
      if(ids.length){
        // Worksheet statistics come from the actual assignment records; no invented counts.
        const results=await Promise.allSettled(ids.map(id=>meratV2Request(`/Api/TahghighV2/CountyInvestigatorWorksheet?assignmentId=${id}`)));
        if(!active)return;
        const loaded:SummaryWorksheet[]=[];let errors=0;
        for(const result of results){
          if(result.status==="fulfilled") loaded.push(...result.value as SummaryWorksheet[]);
          else errors++;
        }
        setWorksheets(loaded);
        if(errors)setWorksheetWarning("جزئیات برخی کاربرگ‌ها دریافت نشد؛ آمار روی برگه ممکن است کامل نباشد.");
      }
    }catch(e){if(active)setError(e instanceof Error?e.message:"دریافت جمع‌بندی انجام نشد.");}
    finally{if(active)setLoading(false);}
  })();
  return ()=>{active=false;};
 },[referralId,onReadyChange]);
 useEffect(()=>{
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";
  const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"&&!saving){event.preventDefault();onReadyChange(saved.trim().length>=20);onClose();}};
  document.addEventListener("keydown",escape);
  return ()=>{document.body.style.overflow=previous;document.removeEventListener("keydown",escape);};
 },[saving,onClose,saved,onReadyChange]);

 const clean=text.trim();const unchanged=clean===saved.trim();
 async function persistText():Promise<number>{
   const result=await meratV2Request("/Api/TahghighV2/SaveCountySummary",{countyReferralId:referralId,summaryText:clean});
   const id=toId(result[0]?.SummaryId)??summaryId;
   if(!id)throw new Error("متن ثبت شد، اما شناسه جمع‌بندی برای ثبت تصویر از سرور دریافت نشد.");
   setSummaryId(id);setSaved(clean);setText(clean);onReadyChange(true);return id;
 }
 async function closeWithoutSaving(){
  if(saving)return;
  if(clean!==saved.trim()){
   const leave=await meratConfirm("تغییرات ذخیره‌نشده جمع‌بندی شهرستان کنار گذاشته شود؟");
   if(!leave)return;
  }
  onReadyChange(saved.trim().length>=20);
  onClose();
 }
 async function saveDraft(){if(!working||saving||clean.length<20||clean.length>10000)return;
  setSaving(true);setError("");setNotice("");
  try {await persistText();setImagePending(true);setNotice("متن جمع‌بندی موقت ذخیره شد؛ تصویر ایجاد یا جایگزین نشد.");}
  catch(e){setError(e instanceof Error?e.message:"ذخیره موقت انجام نشد.");}
  finally{setSaving(false);}
 }
 async function createImage(id:number):Promise<File>{
  const node=captureRef.current?.firstElementChild as HTMLElement|null;
  if(!node)throw new Error("برگه رسمی جمع‌بندی برای تولید تصویر آماده نیست.");
  if(document.fonts?.ready)await document.fonts.ready;
  await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
  const logo=node.querySelector<HTMLImageElement>('img[data-merat-summary-logo="true"]');
  if(!logo)throw new Error("تصویر مهر فرم جمع‌بندی یافت نشد.");
  try{await logo.decode();}catch{throw new Error("بارگذاری تصویر مهر جمع‌بندی انجام نشد.");}
  if(!logo.naturalWidth)throw new Error("فایل مهر فرم جمع‌بندی معتبر نیست.");
  const width=node.scrollWidth,height=node.scrollHeight;
  if(width<100||height<100)throw new Error("ابعاد تصویر جمع‌بندی معتبر نیست.");
  const scale=2;
  const data=await domtoimage.toPng(node,{
   width:width*scale,height:height*scale,
   style:{transform:`scale(${scale})`,transformOrigin:"top left",width:`${width}px`,height:`${height}px`},
   bgcolor:"#ffffff"
  });
  const png=await (await fetch(data)).blob();
  if(png.size<=MAX_BYTES)return new File([png],`JambandiShahrestan_${id}.png`,{type:"image/png"});
  const bitmap=await createImageBitmap(png);
  try{
   const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
   canvas.getContext("2d")?.drawImage(bitmap,0,0);
   for(const quality of [0.92,0.84,0.73,0.60]){
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    if(blob&&blob.size<=MAX_BYTES)return new File([blob],`JambandiShahrestan_${id}.jpg`,{type:"image/jpeg"});
   }
  }finally{bitmap.close();}
  throw new Error("حجم تصویر جمع‌بندی بیشتر از سه مگابایت است؛ متن را کوتاه‌تر کنید.");
 }
 async function finalize(){if(!working||saving||clean.length<20||clean.length>10000)return;
  setSaving(true);setError("");setNotice("");
  let textSaved=false;
  try{
   // Only images generated by THIS county summary may be replaced; other documents remain untouched.
   const previous=summaryId?await attachments(summaryId):[];
   const generated=previous.filter(item=>new RegExp(`^JambandiShahrestan_${summaryId}\\.(png|jpe?g)$`,"i").test(item.OriginalFileName));
   if(generated.length){
    const ok=await meratConfirm(`برای این جمع‌بندی ${generated.length.toLocaleString("fa-IR")} تصویر قبلی وجود دارد. پس از ثبت تصویر جدید، فقط تصویرهای تولیدشده قبلی حذف منطقی شوند؟`);
    if(!ok)return;
   }
   const id=await persistText();textSaved=true;setImagePending(true);
   const file=await createImage(id);
   await upload(id,file);
   // The new document is safely stored before any old generated image is removed.
   const removalErrors:string[]=[];
   for(const old of generated){try{await deleteOldImage(old.AttachmentId);}catch(e){removalErrors.push(e instanceof Error?e.message:String(e));}}
   setImagePending(false);setRefresh(v=>v+1);
   if(removalErrors.length){setError("تصویر جدید ذخیره شد؛ اما حذف برخی تصاویر قدیمی انجام نشد. اسناد را در فهرست پیوست‌ها بررسی کنید.");return;}
   setNotice("متن و تصویر رسمی جمع‌بندی شهرستان ثبت شدند.");onClose();
  }catch(e){setError(textSaved
   ?`متن جمع‌بندی ذخیره شد ولی تصویر ثبت نشد؛ اسناد قبلی حفظ شدند: ${e instanceof Error?e.message:String(e)}`
   :e instanceof Error?e.message:"ثبت جمع‌بندی انجام نشد.");}
  finally{setSaving(false);}
 }
 const sheet=(editable:boolean)=><InvestigatorSummarySheet
    identity={identity} worksheets={worksheets} investigatorName={countyName}
    countyName={countyName} variant="COUNTY" assignmentId={referralId}
    summaryText={text} onChange={value=>{setText(value);onReadyChange(false);setNotice("");}}
    editable={editable}/>;
 if(typeof document==="undefined")return null;
 return createPortal(<div className={summaryStyles.summaryReportBackdrop} role="presentation">
  <section className={summaryStyles.summaryReportDialog} role="dialog" aria-modal="true" aria-label="فرم جمع‌بندی شهرستان" dir="rtl">
   <header className={summaryStyles.summaryReportToolbar}>
    <strong>فرم جمع‌بندی شهرستان</strong>
    <div>
     {working&&<button type="button" disabled={loading||saving||clean.length<20||clean.length>10000||unchanged} onClick={()=>void saveDraft()}>
      {saving?"در حال ذخیره…":"ذخیره موقت (بدون تصویر)"}</button>}
     {working&&<button type="button" className={summaryStyles.confirmClose} disabled={loading||saving||clean.length<20||clean.length>10000||Boolean(error&&rows.length===0)} onClick={()=>void finalize()}>
      {saving?"در حال ثبت متن و تصویر…":"✓ تأیید و بستن"}</button>}
     <button type="button" disabled={saving} onClick={closeWithoutSaving}>بستن</button>
    </div>
   </header>
   {error&&<div className={s.warning} role="alert" style={{padding:"8px 16px",margin:0}}>{error}</div>}
   {notice&&<div className={s.success} role="status" style={{padding:"8px 16px",margin:0}}>{notice}</div>}
   <div className={summaryStyles.summaryReportScroll}>
    {loading?<p role="status">در حال دریافت اطلاعات پرونده و کاربرگ‌ها…</p>:<>
     {worksheetWarning&&<p className={s.warning} role="alert">{worksheetWarning}</p>}
     {sheet(working&&!saving)}
     <small>اطلاعات پرونده و کاربرگ‌ها از ارجاع جاری شهرستان خوانده می‌شود. ذخیره موقت فقط متن را ثبت می‌کند؛ «تأیید و بستن» متن و تصویر فرم را ثبت می‌کند.</small>
     {imagePending&&<p className={s.warning}>متن ذخیره شده است ولی تصویر جدید هنوز تأیید و ثبت نشده است.</p>}
     <section className={s.panel} style={{width:"min(1200px,100%)"}} aria-label="نتایج محققان شهرستان">
      <h3 className={s.heading}>نتایج محققان شهرستان</h3>
      <div className={s.tableWrap}><table className={s.table}><thead><tr><th>انتساب</th><th>وضعیت</th><th>کاربرگ‌ها</th><th>متن جمع‌بندی محقق</th></tr></thead><tbody>
      {rows.filter(item=>item.AssignmentId!=null).map(item=><tr key={String(item.AssignmentId)}><td>{asText(item.AssignmentId)}</td><td>{asText(item.AssignmentStatus)}</td><td>{asText(item.WorksheetCount)}</td><td><p className={s.pre}>{asText(item.InvestigatorSummary)}</p></td></tr>)}
      {rows.every(item=>item.AssignmentId==null)&&<tr><td colSpan={4}>هنوز محققی برای این پرونده ثبت نشده است.</td></tr>}
      </tbody></table></div>
     </section>
     {summaryId!==null&&<div style={{width:"min(1200px,100%)"}}>
      <SummaryAttachmentsPanel key={`${summaryId}-${refresh}`} level="COUNTY" summaryRecordId={summaryId} readOnly={!working||saving}/>
     </div>}
    </>}
   </div>
   {/* Read-only clone guarantees that the PNG contains the complete printable text,
       never a textarea, modal toolbar, or a clipped scrolled viewport. */}
   {!loading&&<div ref={captureRef} className={summaryStyles.reportCapture} aria-hidden="true">{sheet(false)}</div>}
  </section>
 </div>,document.body);
}
