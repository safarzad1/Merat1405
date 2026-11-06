"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronDown, ClipboardList, FileImage, FilePlus2, Pencil, Plus, CheckCircle2, CornerDownRight, RefreshCw, Trash2, UploadCloud, X, ZoomIn, ZoomOut, RotateCcw, ChevronRight, ChevronLeft, Download } from "lucide-react";
import NewsJalaliDatePicker from "@/app/AkhbarManage/NewsJalaliDatePicker";
import styles from "./ExecutionPanel.module.css";

type TargetRow={TargetId:number;ProjectTitle:string;TaskTitle:string;PersianYear:number;Quarter:number;TargetValue:number;ProvinceName:string;AssigneeCount:number;ApprovedValue:number};
type TargetDetail={TargetId:number;PersianYear:number;Quarter:number;TargetValue:number;ProvinceName:string;ProjectTitle:string;TaskTitle:string;IsSetad:boolean|number;MyAssignmentId:number|null;ApprovedValue:number;PendingValue:number;RejectedValue:number;ReportCount:number};
type Assigned={AssignmentId:number;UserId:number;AssigneeName:string};
type Report={RecordId:number;AssignmentId:number;CreatedByUserId:number;ActivityDatePersian:string;Description:string;ActualValue:number;ReviewStatus:string;ReviewReason:string|null;ReporterName:string;FileCount:number;CreatedAtUtc:string;UpdatedAtUtc:string|null};
type Attachment={FileId:number;RecordId:number;OriginalFileName:string;MimeType:string;FileSize:number};
type History={ChangeId:number;RecordId:number;ActionCode:string;ChangedAtUtc:string;ActorName:string};
type ReviewEvent={ReviewEventId:number;RecordId:number;ActionCode:string;FromStatus:string;ToStatus:string;Reason:string|null;ActorName:string;CreatedAtUtc:string};
type ReviewQueueRow={RecordId:number;TargetId:number;ReporterName:string;ProjectTitle:string;TaskTitle:string;ProvinceName:string;ActivityDatePersian:string;ActualValue:number;CreatedAtUtc:string};
type ReviewDialog={recordId:number;reporter:string;decision:"APPROVED"|"REJECTED";reason:string};
type Detail={target:TargetDetail;assignees:Assigned[];reports:Report[];files:Attachment[];history:History[];reviewEvents:ReviewEvent[]};
type Form={id:number|null;assignmentId:number;date:string;description:string;value:string};
type Confirmation={kind:"report"|"file";id:number;label:string};
const quarters=["","بهار","تابستان","پاییز","زمستان"];
const fa=(v:number)=>new Intl.NumberFormat("fa-IR",{maximumFractionDigits:2}).format(Number(v)||0);
const digits=(v:string|number)=>String(v).replace(/\d/g,c=>"۰۱۲۳۴۵۶۷۸۹"[Number(c)]);
const latin=(v:string)=>v.replace(/[۰-۹٠-٩]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)>=0?"۰۱۲۳۴۵۶۷۸۹".indexOf(c):"٠١٢٣٤٥٦٧٨٩".indexOf(c))).replace(/٫/g,".");
const datePattern=/^1[3-5]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
const status=(s:string)=>s==="APPROVED"?"تأییدشده":s==="REJECTED"?"برگشت‌خورده":"در انتظار بررسی";
const action=(s:string)=>({CREATED:"ثبت گزارش",UPDATED:"ویرایش گزارش",DELETED:"حذف گزارش",FILE_ADDED:"افزودن پیوست",FILE_REMOVED:"حذف پیوست",APPROVED:"تأیید ستاد",REJECTED:"برگشت ستاد",RESUBMITTED:"اصلاح و ارسال مجدد"}[s]??s);
const getFileUrl=(fileId:number)=>`/Api/TaskManagement/Execution/File?fileId=${fileId}`;

export default function ExecutionPanel({targets,isSetad}:{targets:TargetRow[];isSetad:boolean}){
 const router=useRouter();
 const [selected,setSelected]=useState<number|null>(null);
 const [detail,setDetail]=useState<Detail|null>(null);
 const [loading,setLoading]=useState(false);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [notice,setNotice]=useState("");
 const [form,setForm]=useState<Form|null>(null);
 const [confirmation,setConfirmation]=useState<Confirmation|null>(null);
 const [showHistory,setShowHistory]=useState(false);
 const [preview,setPreview]=useState<Attachment|null>(null);
 const [zoom,setZoom]=useState(1);
 const [pan,setPan]=useState({x:0,y:0});
 const drag=useRef<{x:number;y:number;px:number;py:number}|null>(null);
 const viewerCanvasRef=useRef<HTMLDivElement>(null);
 const requestSequence=useRef(0);
 const inputRef=useRef<HTMLInputElement>(null);
 const [reviewQueue,setReviewQueue]=useState<ReviewQueueRow[]>([]);
 const [pendingReviewCount,setPendingReviewCount]=useState(0);
 const [queueLoading,setQueueLoading]=useState(false);
 const [reviewDialog,setReviewDialog]=useState<ReviewDialog|null>(null);
 const [queueError,setQueueError]=useState("");

 async function loadQueue(){
  if(!isSetad)return;
  setQueueLoading(true);setQueueError("");
  try{
   const response=await fetch("/Api/TaskManagement/Execution/Review",{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(String(data.error||"دریافت گزارش‌های در انتظار بررسی ناموفق بود."));
   setReviewQueue(Array.isArray(data.rows)?data.rows:[]);
   setPendingReviewCount(Number(data.summary?.PendingCount)||0);
  }catch(err){setQueueError(err instanceof Error?err.message:"خطا در دریافت پیشخوان بررسی.");}
  finally{setQueueLoading(false);}
 }
 useEffect(()=>{if(isSetad)void loadQueue();},[isSetad]);
 async function confirmReview(){
  if(!reviewDialog||!selected||busy)return;
  const reason=reviewDialog.reason.trim();
  if(reviewDialog.decision==="REJECTED"&&(reason.length<5||reason.length>2000)){
   setError("دلیل برگشت باید حداقل ۵ و حداکثر ۲۰۰۰ نویسه باشد.");return;
  }
  setBusy(true);setError("");
  try{
   const response=await fetch("/Api/TaskManagement/Execution/Review",{
    method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({recordId:reviewDialog.recordId,decision:reviewDialog.decision,reason})
   });
   const data=await response.json();
   if(!response.ok||!data.success)throw new Error(String(data.error||"ثبت نتیجه بررسی ناموفق بود."));
   setReviewDialog(null);
   setNotice(reviewDialog.decision==="APPROVED"?"گزارش تأیید شد و در عملکرد تأییدشده محاسبه می‌شود.":"گزارش با دلیل برگشت داده شد و استان می‌تواند آن را اصلاح و دوباره ارسال کند.");
   await Promise.all([load(selected),loadQueue()]);
   router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"خطا در ثبت نتیجه بررسی.");}
  finally{setBusy(false);}
 }
 async function load(targetId:number){
  const sequence=++requestSequence.current;
  setLoading(true);setError("");
  try{
   const res=await fetch(`/Api/TaskManagement/Execution?targetId=${targetId}`,{cache:"no-store"});
   const data=await res.json();
   if(!res.ok||!data.target)throw new Error(String(data.error||"دریافت عملکرد ناموفق بود."));
   if(requestSequence.current===sequence)setDetail(data as Detail);
  }catch(err){if(requestSequence.current===sequence){setDetail(null);setError(err instanceof Error?err.message:"خطا در دریافت اطلاعات.");}}
  finally{if(requestSequence.current===sequence)setLoading(false);}
 }
 function choose(id:number){
  setForm(null);setNotice("");setError("");setShowHistory(false);
  if(selected===id){++requestSequence.current;setSelected(null);setDetail(null);return;}
  setSelected(id);setDetail(null);void load(id);
 }
 useEffect(()=>{return()=>{requestSequence.current+=1;};},[]);
 useEffect(()=>{
  const canvas=viewerCanvasRef.current;
  if(!canvas||!preview?.MimeType.startsWith("image/"))return;
  const wheel=(e:WheelEvent)=>{e.preventDefault();setZoom(z=>Math.max(1,Math.min(6,z+(e.deltaY<0?.2:-.2))));};
  canvas.addEventListener("wheel",wheel,{passive:false});
  return()=>canvas.removeEventListener("wheel",wheel);
 },[preview]);
 const actorAssignmentId=Number(detail?.target.MyAssignmentId||0);
 const canWrite=!isSetad&&actorAssignmentId>0;
 function openForm(report?:Report){
  if(!detail||!canWrite)return;
  setError("");setNotice("");
  const t=detail.target;
  const startMonth=(t.Quarter-1)*3+1;
  setForm({id:report?.RecordId??null,assignmentId:actorAssignmentId,
   date:report?.ActivityDatePersian??`${t.PersianYear}/${String(startMonth).padStart(2,"0")}/01`,
   description:report?.Description??"",value:report?String(report.ActualValue):""});
 }
 async function mutate(payload:Record<string,unknown>){
  const res=await fetch("/Api/TaskManagement/Execution",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
  const data=await res.json();
  if(!res.ok||!data.success)throw new Error(String(data.error||"ثبت اطلاعات ناموفق بود."));
  return data;
 }
 async function save(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!form||!selected||busy)return;
  const v=Number(latin(form.value));const d=latin(form.date);
  if(!datePattern.test(d)){setError("تاریخ شمسی معتبر را وارد کنید.");return;}
  if(!detail||Number(d.slice(0,4))!==Number(detail.target.PersianYear)||Math.floor((Number(d.slice(5,7))-1)/3)+1!==Number(detail.target.Quarter)){
   setError("تاریخ گزارش باید در فصل و سال همین هدف باشد.");return;
  }
  if(!Number.isFinite(v)||v<=0||Math.abs(Math.round(v*100)-v*100)>1e-7){setError("مقدار انجام‌شده را با حداکثر دو رقم اعشار وارد کنید.");return;}
  if(!form.description.trim()||form.description.length>2000){setError("شرح فعالیت باید بین ۱ تا ۲۰۰۰ نویسه باشد.");return;}
  setBusy(true);setError("");
  try{
   await mutate({action:"save",recordId:form.id,assignmentId:form.assignmentId,date:d,description:form.description.trim(),value:v});
   setForm(null);setNotice(form.id?"گزارش ویرایش شد.":"گزارش ثبت شد؛ اکنون می‌توانید مستندات آن را اضافه کنید.");
   await load(selected);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"ثبت گزارش انجام نشد.");}
  finally{setBusy(false);}
 }
 async function confirmDelete(){
  if(!confirmation||busy||!selected)return;
  setBusy(true);setError("");
  try{
   if(confirmation.kind==="report")await mutate({action:"delete",recordId:confirmation.id});
   else{
    const res=await fetch("/Api/TaskManagement/Execution/File",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({fileId:confirmation.id})});
    const data=await res.json();if(!res.ok||!data.success)throw new Error(String(data.error||"حذف پیوست ناموفق بود."));
   }
   setConfirmation(null);setNotice("عملیات ثبت شد.");await load(selected);router.refresh();
  }catch(err){setError(err instanceof Error?err.message:"حذف انجام نشد.");}
  finally{setBusy(false);}
 }
 async function upload(recordId:number,files:FileList|null){
  if(!files||!selected||busy)return;
  if(files.length>8){setError("حداکثر ۸ پیوست برای هر گزارش مجاز است.");return;}
  setBusy(true);setError("");setNotice("");
  let successful=0;
  let uploadError="";
  try{
   for(const file of Array.from(files)){
    if(file.size>8*1024*1024||file.size===0)throw new Error("حجم هر فایل باید حداکثر ۸ مگابایت باشد.");
    const form=new FormData();form.append("recordId",String(recordId));form.append("file",file);
    const res=await fetch("/Api/TaskManagement/Execution/File",{method:"POST",body:form});
    const data=await res.json();if(!res.ok||!data.success)throw new Error(String(data.error||"بارگذاری پیوست ناموفق بود."));
    successful++;
   }
   setNotice(`${fa(successful)} پیوست ذخیره شد.`);
  }catch(err){uploadError=`${fa(successful)} پیوست ذخیره شد؛ ${err instanceof Error?err.message:"خطا در بارگذاری پیوست"}`;}
  finally{if(inputRef.current)inputRef.current.value="";await load(selected);if(uploadError)setError(uploadError);setBusy(false);}
 }
 function showPreview(file:Attachment){setPreview(file);setZoom(1);setPan({x:0,y:0});drag.current=null;}
 function changePreview(delta:number){
  if(!preview||!detail)return;
  const list=detail.files.filter(f=>f.MimeType.startsWith("image/"));const index=list.findIndex(f=>f.FileId===preview.FileId);
  if(index<0||list.length<2)return;showPreview(list[(index+delta+list.length)%list.length]);
 }
 const visibleReports=detail?.reports??[];
 return <section className={styles.panel} aria-label="ثبت و پیگیری عملکرد" dir="rtl">
  <header className={styles.heading}>
   <div className={styles.headingTitle}><ClipboardList size={19}/><h2>{isSetad?"پایش عملکرد استان‌ها":"اجرای وظایف و ثبت عملکرد"}</h2></div>
   <span className={styles.count}>{fa(targets.length)} مأموریت</span>
  </header>
  {isSetad&&<section className={styles.reviewQueue} aria-label="پیشخوان بررسی گزارش‌های ستاد">
   <header className={styles.queueHeader}>
    <div><CheckCircle2 size={18}/><span>گزارش‌های در انتظار بررسی</span><span className={styles.queueCount}>{fa(pendingReviewCount)}</span></div>
    <button type="button" disabled={queueLoading} onClick={()=>void loadQueue()} title="به‌روزرسانی پیشخوان"><RefreshCw size={16}/> به‌روزرسانی</button>
   </header>
   {queueError&&<p className={styles.error} role="alert">{queueError}</p>}
   {queueLoading?<p className={styles.empty}>در حال دریافت گزارش‌ها...</p>:reviewQueue.length===0?<p className={styles.empty}>گزارش در انتظار بررسی وجود ندارد.</p>:
    <div className={styles.reviewQueueRows}>
     {reviewQueue.map(item=><button key={item.RecordId} type="button" className={styles.queueRow} onClick={()=>{if(selected!==item.TargetId)choose(item.TargetId);else void load(item.TargetId);}}>
      <span className={styles.queueMain}>{item.TaskTitle}<small>{item.ProjectTitle}</small></span>
      <span>{item.ProvinceName}</span><span>{item.ReporterName}</span>
      <span>{digits(item.ActivityDatePersian)}</span><span>{fa(item.ActualValue)} واحد</span>
      <span className={styles.queueOpen}><CornerDownRight size={14}/> مشاهده و بررسی</span>
     </button>)}
    </div>}
  </section>}
  {targets.length===0?<p className={styles.empty}>مأموریت منتشرشده‌ای برای ثبت عملکرد وجود ندارد.</p>:<div className={styles.targets}>
   {targets.map(t=>{
    const opened=selected===t.TargetId;
    const percent=t.TargetValue>0?Math.min(100,100*Number(t.ApprovedValue)/Number(t.TargetValue)):0;
    return <div className={`${styles.targetWrap} ${opened?styles.targetActive:""}`} key={t.TargetId}>
     <button type="button" className={styles.targetButton} aria-expanded={opened} onClick={()=>choose(t.TargetId)}>
      <ChevronDown size={16} className={opened?styles.up:""}/>
      <span className={styles.taskName}>{t.TaskTitle}<small>{t.ProjectTitle}</small></span>
      <span className={styles.province}>{t.ProvinceName}</span>
      <span className={styles.period}>{quarters[t.Quarter]} {digits(t.PersianYear)}</span>
      <span className={styles.goal}>{fa(t.ApprovedValue)} <small>از {fa(t.TargetValue)}</small></span>
      <span className={styles.percent}>{fa(percent)}٪</span>
     </button>
     {opened&&<div className={styles.body}>
      {loading?<p className={styles.empty}>در حال دریافت گزارش‌ها...</p>:detail&&detail.target.TargetId===selected?<>
       <div className={styles.summary}>
        <div><span>هدف مصوب</span><b>{fa(detail.target.TargetValue)}</b></div>
        <div><span>تأییدشده</span><b>{fa(detail.target.ApprovedValue)}</b></div>
        <div><span>در انتظار بررسی</span><b>{fa(detail.target.PendingValue)}</b></div>
        <div><span>باقی‌مانده</span><b>{fa(Math.max(0,Number(detail.target.TargetValue)-Number(detail.target.ApprovedValue)))}</b></div>
       </div>
       <div className={styles.progress} aria-label="درصد تحقق تأییدشده"><span style={{width:`${percent}%`}}/></div>
       <div className={styles.bar}>
        <span>گزارش‌ها ({fa(visibleReports.length)})</span>
        {canWrite&&<button type="button" className={styles.primary} onClick={()=>openForm()}><Plus size={16}/> ثبت عملکرد</button>}
       </div>
       {detail.assignees.length>0&&<div className={styles.assignees}>مسئولان: {detail.assignees.map(a=>a.AssigneeName).join("، ")}</div>}
       {!visibleReports.length?<p className={styles.empty}>هنوز گزارشی ثبت نشده است.</p>:<div className={styles.reports}>
        {visibleReports.map(r=>{
         const own=canWrite&&r.AssignmentId===actorAssignmentId&&r.ReviewStatus!=="APPROVED";
         const ownFiles=detail.files.filter(f=>f.RecordId===r.RecordId);
         const ownReviewEvents=(detail.reviewEvents??[]).filter(ev=>ev.RecordId===r.RecordId);
         return <article className={styles.report} key={r.RecordId}>
          <div className={styles.reportHead}>
           <span className={styles.reporter}>{r.ReporterName}</span>
           <span className={styles.muted}>{digits(r.ActivityDatePersian)}</span>
           <span className={styles.value}>{fa(r.ActualValue)} واحد</span>
           <span className={`${styles.state} ${r.ReviewStatus==="APPROVED"?styles.approved:r.ReviewStatus==="REJECTED"?styles.rejected:styles.pending}`}>{status(r.ReviewStatus)}</span>
           {isSetad&&r.ReviewStatus==="PENDING"&&<div className={styles.reviewActions}>
            <button type="button" className={styles.approveButton} disabled={busy} onClick={()=>{setError("");setReviewDialog({recordId:r.RecordId,reporter:r.ReporterName,decision:"APPROVED",reason:""});}}><CheckCircle2 size={15}/> تأیید</button>
            <button type="button" className={styles.rejectButton} disabled={busy} onClick={()=>{setError("");setReviewDialog({recordId:r.RecordId,reporter:r.ReporterName,decision:"REJECTED",reason:""});}}><CornerDownRight size={15}/> برگشت</button>
           </div>}
           {own&&r.ReviewStatus==="REJECTED"&&<button type="button" className={styles.resubmit} disabled={busy} onClick={()=>openForm(r)}><Pencil size={14}/> اصلاح و ارسال مجدد</button>}
           {own&&<div className={styles.actions}>
            {r.ReviewStatus==="PENDING"&&<button type="button" title="ویرایش گزارش" aria-label="ویرایش گزارش" disabled={busy} onClick={()=>openForm(r)}><Pencil size={15}/></button>}
            <button type="button" title="حذف گزارش" aria-label="حذف گزارش" disabled={busy} onClick={()=>setConfirmation({kind:"report",id:r.RecordId,label:"این گزارش حذف شود؟"})}><Trash2 size={15}/></button>
           </div>}
          </div>
          <p className={styles.description}>{r.Description}</p>
          {r.ReviewReason&&<p className={styles.rejectReason}>دلیل برگشت: {r.ReviewReason}</p>}
          {ownReviewEvents.length>0&&<details className={styles.reviewTrail}>
           <summary>سوابق تأیید و برگشت ({fa(ownReviewEvents.length)})</summary>
           {ownReviewEvents.map(ev=><div className={styles.reviewEvent} key={ev.ReviewEventId}>
            <span>{action(ev.ActionCode)}</span><span>{ev.ActorName}</span>
            <span>{new Date(ev.CreatedAtUtc).toLocaleString("fa-IR")}</span>
            {ev.Reason&&<p>دلیل برگشت: {ev.Reason}</p>}
           </div>)}
          </details>}
          <div className={styles.files}>
           {ownFiles.map(f=><div key={f.FileId} className={styles.file}>
            <button type="button" className={styles.fileOpen} onClick={()=>showPreview(f)} title={f.OriginalFileName}>
             <FileImage size={15}/><span>{f.OriginalFileName}</span></button>
            {own&&r.ReviewStatus==="PENDING"&&<button type="button" className={styles.removeFile} title="حذف پیوست" disabled={busy} onClick={()=>setConfirmation({kind:"file",id:f.FileId,label:`پیوست «${f.OriginalFileName}» حذف شود؟`})}><X size={15}/></button>}
           </div>)}
           {own&&r.ReviewStatus==="PENDING"&&<label className={`${styles.upload} ${busy?styles.disabled:""}`}><UploadCloud size={15}/> افزودن پیوست
             <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf" multiple disabled={busy} onChange={e=>void upload(r.RecordId,e.target.files)}/>
            </label>}
          </div>
         </article>;
        })}
       </div>}
       {detail.history.length>0&&<div className={styles.history}>
        <button type="button" onClick={()=>setShowHistory(v=>!v)} aria-expanded={showHistory}>تاریخچه اقدامات ({fa(detail.history.length)}) <ChevronDown size={14}/></button>
        {showHistory&&detail.history.map(h=><div key={h.ChangeId} className={styles.historyLine}><span>{action(h.ActionCode)}</span><span>{h.ActorName}</span><span>{new Date(h.ChangedAtUtc).toLocaleString("fa-IR")}</span></div>)}
       </div>}
      </>:null}
      {error&&<p role="alert" className={styles.error}>{error}</p>}
      {notice&&<p role="status" className={styles.success}>{notice}</p>}
     </div>}
    </div>;
   })}
  </div>}
  {reviewDialog&&<div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setReviewDialog(null);}}>
   <div className={styles.modal} role="alertdialog" aria-modal="true" aria-label={reviewDialog.decision==="APPROVED"?"تأیید گزارش عملکرد":"برگشت گزارش عملکرد"}>
    <header className={styles.modalHeader}><h3>{reviewDialog.decision==="APPROVED"?"تأیید گزارش عملکرد":"برگشت گزارش عملکرد"}</h3>
     <button type="button" aria-label="بستن" disabled={busy} onClick={()=>setReviewDialog(null)}><X size={18}/></button>
    </header>
    <div className={styles.fields}>
     <p className={styles.reviewIntro}>گزارش {reviewDialog.reporter} — {digits(reviewDialog.recordId)}</p>
     {reviewDialog.decision==="APPROVED"?<p className={styles.reviewMessage}>پس از تأیید، مقدار گزارش در عملکرد تأییدشده لحاظ می‌شود و استان امکان تغییر آن را نخواهد داشت. تأیید می‌کنید؟</p>:
      <label><span className={styles.fieldLabel}>دلیل برگشت <em>*</em></span>
       <textarea autoFocus rows={5} required minLength={5} maxLength={2000} placeholder="علت برگشت گزارش را روشن و دقیق بنویسید" value={reviewDialog.reason}
        onChange={e=>setReviewDialog(d=>d?{...d,reason:e.target.value}:d)}/>
       <span className={styles.hint}>دلیل ثبت‌شده به استان نمایش داده می‌شود و در تاریخچه باقی می‌ماند.</span>
      </label>}
     {error&&<p className={styles.error} role="alert">{error}</p>}
    </div>
    <footer className={styles.modalFooter}>
     <button type="button" disabled={busy} onClick={()=>setReviewDialog(null)}>انصراف</button>
     <button type="button" disabled={busy||reviewDialog.decision==="REJECTED"&&reviewDialog.reason.trim().length<5}
      className={reviewDialog.decision==="REJECTED"?styles.danger:styles.primary} onClick={()=>void confirmReview()}>
      {busy?"در حال ثبت...":reviewDialog.decision==="APPROVED"?"بله، تأیید شود":"ثبت برگشت با دلیل"}
     </button>
    </footer>
   </div>
  </div>}
  {form&&<div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setForm(null);}}>
   <div className={styles.modal} role="dialog" aria-modal="true" aria-label="ثبت گزارش عملکرد">
    <header className={styles.modalHeader}><h3>{form.id?"ویرایش عملکرد":"ثبت عملکرد"}</h3><button type="button" aria-label="بستن" disabled={busy} onClick={()=>setForm(null)}><X size={18}/></button></header>
    <form onSubmit={e=>void save(e)}>
     <div className={styles.fields}>
      <div className={styles.dual}>
       <div><span className={styles.fieldLabel}>تاریخ فعالیت <em>*</em></span><NewsJalaliDatePicker label="تاریخ فعالیت" value={form.date} onChange={v=>setForm(f=>f?{...f,date:v}:f)} maxToday/></div>
       <label><span className={styles.fieldLabel}>مقدار انجام‌شده <em>*</em></span><input type="text" inputMode="decimal" required placeholder="مثلاً ۱۲" value={form.value} onChange={e=>setForm(f=>f?{...f,value:e.target.value}:f)}/></label>
      </div>
      <label><span className={styles.fieldLabel}>شرح فعالیت <em>*</em></span><textarea required maxLength={2000} rows={4} value={form.description} onChange={e=>setForm(f=>f?{...f,description:e.target.value}:f)} placeholder="شرح اقدام انجام‌شده را بنویسید"/></label>
      <p className={styles.hint}>مستندات را پس از ذخیره گزارش، از ردیف همان گزارش اضافه کنید.</p>
      {error&&<p role="alert" className={styles.error}>{error}</p>}
     </div>
     <footer className={styles.modalFooter}><button type="button" disabled={busy} onClick={()=>setForm(null)}>انصراف</button><button type="submit" className={styles.primary} disabled={busy}>{busy?"در حال ذخیره...":"ذخیره عملکرد"}</button></footer>
    </form>
   </div>
  </div>}
  {confirmation&&<div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirmation(null);}}>
   <div className={styles.modal} role="alertdialog" aria-modal="true" aria-label="تأیید حذف">
    <header className={styles.modalHeader}><h3>تأیید حذف</h3><button type="button" aria-label="بستن" disabled={busy} onClick={()=>setConfirmation(null)}><X size={18}/></button></header>
    <p className={styles.confirmText}>{confirmation.label}</p>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <footer className={styles.modalFooter}><button type="button" disabled={busy} onClick={()=>setConfirmation(null)}>انصراف</button><button type="button" className={styles.danger} disabled={busy} onClick={()=>void confirmDelete()}>{busy?"در حال حذف...":"بله، حذف شود"}</button></footer>
   </div>
  </div>}
  {preview&&<div className={styles.viewerBackdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setPreview(null);}}>
   <div className={styles.viewer} role="dialog" aria-modal="true" aria-label="نمایش مستند">
    <header className={styles.viewerTop}>
     <span title={preview.OriginalFileName}>{preview.OriginalFileName}</span>
     <div className={styles.viewerTools}>
      {preview.MimeType.startsWith("image/")&&<>
       <button type="button" title="تصویر قبلی" onClick={()=>changePreview(-1)}><ChevronRight size={19}/></button>
       <button type="button" title="بزرگ‌نمایی" onClick={()=>setZoom(z=>Math.min(6,z+.25))}><ZoomIn size={19}/></button>
       <button type="button" title="کوچک‌نمایی" onClick={()=>setZoom(z=>Math.max(1,z-.25))}><ZoomOut size={19}/></button>
       <button type="button" title="بازنشانی" onClick={()=>{setZoom(1);setPan({x:0,y:0});}}><RotateCcw size={18}/></button>
       <button type="button" title="تصویر بعدی" onClick={()=>changePreview(1)}><ChevronLeft size={19}/></button>
      </>}
      <a href={getFileUrl(preview.FileId)} target="_blank" rel="noreferrer" title="باز کردن پیوست"><Download size={18}/></a>
      <button type="button" onClick={()=>setPreview(null)} aria-label="بستن"><X size={19}/></button>
     </div>
    </header>
    <div ref={viewerCanvasRef} className={styles.viewerCanvas}>
     {preview.MimeType.startsWith("image/")?<img src={getFileUrl(preview.FileId)} alt={preview.OriginalFileName}
      draggable={false} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`,cursor:zoom>1?"grab":"zoom-in"}}
      onPointerDown={e=>{if(zoom<=1)return;drag.current={x:e.clientX,y:e.clientY,px:pan.x,py:pan.y};e.currentTarget.setPointerCapture(e.pointerId);}}
      onPointerMove={e=>{if(drag.current){setPan({x:drag.current.px+e.clientX-drag.current.x,y:drag.current.py+e.clientY-drag.current.y});}}}
      onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}/>:
      <iframe src={getFileUrl(preview.FileId)} title={preview.OriginalFileName}/>}
    </div>
   </div>
  </div>}
 </section>;
}
