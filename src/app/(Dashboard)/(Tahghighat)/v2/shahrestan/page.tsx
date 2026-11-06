"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {meratConfirm} from "@/component/MeratFeedback/feedback";
import ChildReturnNotice from "@/app/(Dashboard)/(Tahghighat)/v2/components/ChildReturnNotice";
import {meratV2Request,type V2Row} from "@/app/lib/meratV2/client";
import {StateChip} from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";
import ProvinceInvestigatorWorksheetEditor from "@/app/(Dashboard)/(Tahghighat)/v2/components/ProvinceInvestigatorWorksheetEditor";
import SearchableDropdown from "@/component/Dropdown/SearchableDropdown";
import InputPersianDate,{getTodayJalali} from "@/component/Objects/InputPersianDatePicker";
import s from "../hoze/HozeCase.module.css";
const num=(v:unknown)=>Number(v??0);
const txt=(v:unknown)=>v==null||v===""?"—":String(v);
const active=(x:V2Row)=>["PENDING","IN_PROGRESS"].includes(String(x.StatusCode));
type ReplyItem = {AssignmentId:number;FullName:string;CountyName:string;OriginalSummary:string;EditedSummary:string|null;StatusCode:string;IsReady:boolean;IsSaved:boolean};
const date=(v:unknown)=>{if(!v)return "—";const d=new Date(String(v));return Number.isNaN(d.getTime())?String(v).slice(0,10):new Intl.DateTimeFormat("fa-IR-u-ca-persian",{year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
export default function CountyRepresentativePage(){
 const router=useRouter();
 const [inbox,setInbox]=useState<V2Row[]>([]),[ref,setRef]=useState<number|null>(null),[assignments,setAssignments]=useState<V2Row[]>([]),[candidates,setCandidates]=useState<V2Row[]>([]);
 const [inboxError,setInboxError]=useState(""),[assignmentError,setAssignmentError]=useState(""),[candidateError,setCandidateError]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(false),[candidateLoading,setCandidateLoading]=useState(false);
 const [started,setStarted]=useState(false),[assignModal,setAssignModal]=useState(false),[finalModal,setFinalModal]=useState(false),[worksheetId,setWorksheetId]=useState<number|null>(null),[cancelId,setCancelId]=useState<number|null>(null);
 const [investigator,setInvestigator]=useState(""),[instruction,setInstruction]=useState(""),[dueDate,setDueDate]=useState(()=>getTodayJalali()),[reason,setReason]=useState("");
 const [replyItems,setReplyItems]=useState<ReplyItem[]>([]);
 const [replyReport,setReplyReport]=useState("");
 const [replySaved,setReplySaved]=useState("");
 const [replyExists,setReplyExists]=useState(false);
 const [replyLoading,setReplyLoading]=useState(false),[replyError,setReplyError]=useState(""),[replyNotice,setReplyNotice]=useState("");
 const [expanded,setExpanded]=useState({investigators:true});
 const row=inbox.find(x=>num(x.CountyReferralId)===ref);
 const working=String(row?.StateCode)==="CHILD_WORKING";
 const isSent=String(row?.StateCode)==="CHILD_REPLIED";
 const canStart=String(row?.StateCode)==="CHILD_INBOX";
 const pendingCount=assignments.filter(active).length;
 const completedCount=assignments.filter(x=>String(x.StatusCode)==="DONE").length;
 const canSendToHoze=working&&!loading&&!assignmentError&&completedCount>0&&pendingCount===0;
 const caseName=[row?.FirstName,row?.LastName].filter(Boolean).join(" ")||`شماره پرونده ${txt(row?.ShomarehParvandeh)}`;
 const loadInbox=useCallback(async()=>{try{const data=await meratV2Request("/Api/TahghighV2/CountyInbox?page=1&pageSize=100");setInbox(data);setInboxError("");return data;}catch(e){setInboxError(e instanceof Error?e.message:String(e));return [] as V2Row[];}},[]);
 const loadAssignments=useCallback(async(id:number)=>{try{const data=await meratV2Request(`/Api/TahghighV2/CountyAssignments?countyReferralId=${id}`);
   setAssignments(data);setAssignmentError("");
   // Like the constituency page, reveal the formal worksheet and investigator
   // summary inline when there is exactly one investigator for this referral.
   setWorksheetId(current => {
     const ids = data.map(x => num(x.AssignmentId)).filter(x => Number.isSafeInteger(x) && x > 0);
     if (current !== null && ids.includes(current)) return current;
     return ids.length === 1 ? ids[0] : null;
   });
   return data;}catch(e){setAssignments([]);setAssignmentError(e instanceof Error?e.message:String(e));return [] as V2Row[];}},[]);
 useEffect(()=>{const id=Number(new URLSearchParams(window.location.search).get("referralId"));if(Number.isSafeInteger(id)&&id>0)setRef(id);void loadInbox();},[loadInbox]);
 useEffect(()=>{
   setAssignments([]);setWorksheetId(null);setAssignmentError("");setFinalModal(false);
   if(ref!==null){
     setLoading(true);void loadAssignments(ref).finally(()=>setLoading(false));
   }
 },[ref,loadAssignments]);
 const candidatesAvailable=useMemo(()=>{const used=new Set(assignments.filter(x=>String(x.StatusCode)!=="CANCELLED").map(x=>num(x.PersonId)));const seen=new Set<number>();return candidates.filter(x=>{const id=num(x.PersonId);if(!id||seen.has(id)||used.has(id))return false;seen.add(id);return true;});},[candidates,assignments]);
 const repliesReady=replyItems.length>0&&replyItems.every(x=>x.IsReady&&String(x.StatusCode)==="DONE");
 const repliesValid=repliesReady&&replyReport.trim().length>=20&&replyReport.trim().length<=80000;
 const hasReplyEdits=replyReport.trim()!==replySaved.trim();
 // The outbound text is ONE editable document for the county referral, not
 // a series of independent summary fields. Investigator originals are immutable.
 const initialReport=(items:ReplyItem[])=>items.map((item,index)=>
   `${index+1}. ${item.FullName} — محقق شهرستان ${item.CountyName}\n${(item.EditedSummary??item.OriginalSummary).trim()}`
 ).join("\n\n");
 async function openFinal(){
   if(ref===null||!canSendToHoze)return;
   setFinalModal(true);setReplyLoading(true);setReplyError("");setReplyNotice("");setReplyItems([]);
   setReplyReport("");setReplySaved("");setReplyExists(false);
   try{
     const [data,documentRows]=await Promise.all([
       meratV2Request(`/Api/TahghighV2/CountyReplySummaries?countyReferralId=${ref}`),
       meratV2Request(`/Api/TahghighV2/CountyReplyReport?countyReferralId=${ref}`),
     ]);
     const entries:ReplyItem[]=data.map(item=>({
       AssignmentId:num(item.AssignmentId),FullName:String(item.FullName||"محقق"),
       CountyName:String(item.CountyName||row?.CountyName||"شهرستان"),
       OriginalSummary:String(item.OriginalSummary||""),
       EditedSummary:item.EditedSummary==null?null:String(item.EditedSummary),
       StatusCode:String(item.StatusCode||""),IsReady:item.IsReady===true||item.IsReady===1,
       IsSaved:item.IsSaved===true||item.IsSaved===1,
     }));
     const stored=documentRows[0];
     let snapshotMatches=false;
     try{
       const savedIds=JSON.parse(String(stored?.AssignmentIdsJson||"[]")) as unknown;
       const currentIds=entries.map(item=>item.AssignmentId).sort((a,b)=>a-b);
       snapshotMatches=Array.isArray(savedIds)&&savedIds.length===currentIds.length&&
         savedIds.map(Number).sort((a,b)=>a-b).every((id,index)=>id===currentIds[index]);
     }catch{snapshotMatches=false;}
     const hasStored=snapshotMatches&&stored?.ReportText!=null&&String(stored.ReportText).trim().length>0;
     const text=hasStored?String(stored.ReportText):initialReport(entries);
     if(stored?.ReportText&&!snapshotMatches)setReplyNotice("فهرست محققان این پرونده تغییر کرده است؛ متن خروجی تازه ایجاد شد. آن را بازبینی و ذخیره کنید.");
     setReplyItems(entries);setReplyReport(text);setReplySaved(hasStored?text:"");setReplyExists(hasStored);
   }catch(e){setReplyError(e instanceof Error?e.message:"دریافت جمع‌بندی محققان انجام نشد.");}
   finally{setReplyLoading(false);}
 }
 // After the county has replied, the committed case report remains viewable,
 // but must not be editable or re-sent from the representative's account.
 async function openSentReport(){
   if(ref===null || !isSent)return;
   setFinalModal(true);setReplyLoading(true);setReplyError("");setReplyNotice("");
   setReplyItems([]);setReplyReport("");setReplySaved("");setReplyExists(false);
   try{
     const saved=await meratV2Request(`/Api/TahghighV2/CountyReplyReport?countyReferralId=${ref}`);
     const report=String(saved[0]?.ReportText??"");
     setReplyReport(report);setReplySaved(report);setReplyExists(Boolean(report.trim()));
     if(!report.trim())setReplyError("متن خروجی این پرونده در سامانه یافت نشد.");
   }catch(e){setReplyError(e instanceof Error?e.message:"خواندن متن ارسال‌شده انجام نشد.");}
   finally{setReplyLoading(false);}
 }
 async function persistReply(send:boolean){
   if(!ref||busy||!repliesValid||!canSendToHoze)return;
   if(send&&!await meratConfirm("متن نهایی تجمیعی پرونده ثبت و به حوزه انتخابیه ارسال شود؟"))return;
   setBusy(true);setReplyError("");setReplyNotice("");
   try{
     // Persist the exact edited text as one case-level document. No client text
     // is passed to CountyAction; SQL reads the committed server-side copy.
     if(hasReplyEdits||!replyExists){
       await meratV2Request("/Api/TahghighV2/CountyReplyReport",{
         countyReferralId:ref,reportText:replyReport.trim(),
         assignmentIds:replyItems.map(item=>item.AssignmentId),
       });
       setReplySaved(replyReport.trim());setReplyExists(true);
     }
     if(send){
       await meratV2Request("/Api/TahghighV2/CountyAction",{
         countyReferralId:ref,actionCode:"COUNTY_REPLY",
         description:"ارسال متن نهایی جمع‌بندی محققان شهرستان به حوزه انتخابیه",
       });
       setFinalModal(false);setNotice("متن خروجی یکپارچه پرونده ثبت و پرونده به حوزه انتخابیه ارسال شد.");
       await loadInbox();await loadAssignments(ref);router.push("/TahghighatManage");
     }else setReplyNotice("متن خروجی پرونده به‌صورت یک سند واحد در سامانه ذخیره شد.");
   }catch(e){setReplyError(e instanceof Error?e.message:"ذخیره یا ارسال متن خروجی پرونده انجام نشد.");}
   finally{setBusy(false);}
 }
 async function openAssign(){if(!ref||!working)return;setAssignModal(true);setCandidateError("");setCandidateLoading(true);try{const data=await meratV2Request(`/Api/TahghighV2/CountyCandidates?countyReferralId=${ref}`);setCandidates(data);}catch(e){setCandidateError(e instanceof Error?e.message:String(e));}finally{setCandidateLoading(false)}}
 async function act(url:string,body:Record<string,unknown>,message:string){setBusy(true);setError("");setNotice("");try{await meratV2Request(url,body);setNotice(message);await loadInbox();if(ref)await loadAssignments(ref);return true;}catch(e){setError(e instanceof Error?e.message:String(e));return false;}finally{setBusy(false);}}
 return <main className={`${s.page} ${s.hozePage}`} dir="rtl">
 <nav className={s.breadcrumb}><button onClick={()=>router.push("/Dashboard")}>داشبورد</button><span>/</span><button onClick={()=>router.push("/TahghighatManage")}>مدیریت تحقیقات</button><span>/</span><span className={s.crumbPerson}>{row?`پرونده ${caseName} — شهرستان ${txt(row.CountyName)}`:"پرونده شهرستان"}</span><button className={s.backLink} onClick={()=>router.push("/TahghighatManage")}>بازگشت به پیشخوان</button></nav>
 {inboxError&&<div role="alert" className={s.error}>خطا در دریافت کارتابل: {inboxError} <button onClick={()=>void loadInbox()}>تلاش مجدد</button></div>}
 {error&&<div role="alert" className={s.error}>{error}</div>}{notice&&<div className={s.warning}>{notice}</div>}
 {ref===null&&<section className={s.referralPanel}><div className={s.panelHeading}><strong>پرونده‌های ارجاعی شهرستان</strong></div><div className={s.panelBody}>{inbox.map(x=><button key={num(x.CountyReferralId)} className={s.outlineButton} onClick={()=>{setRef(num(x.CountyReferralId));router.replace(`/v2/shahrestan?referralId=${num(x.CountyReferralId)}`)}}>ارجاع {txt(x.CountyReferralId)} · پرونده {txt(x.ShomarehParvandeh)}</button>)}{!inbox.length&&<p className={s.hint}>ارجاعی دریافت نشده است.</p>}</div></section>}
 {ref!==null&&!row&&!inboxError&&<div className={s.empty}>پرونده انتخاب‌شده در کارتابل این شهرستان یافت نشد. <button className={s.outlineButton} onClick={()=>void loadInbox()}>بازخوانی</button></div>}
 {row&&<>
 {ref!==null && !isSent && <ChildReturnNotice referralId={ref}/>}
 <div className={`${s.metaBar} ${s.mainCaseBar}`}><span className={s.mainCaseBadge}>پرونده شهرستان</span><span><b>داوطلب:</b> {caseName}</span><span><b>شماره پرونده:</b> {txt(row.ShomarehParvandeh)}</span><span><b>نام پدر:</b> {txt(row.NamePedar)}</span><span><b>سال تولد:</b> {txt(row.SalTavalod)}</span><span><b>شماره ملی:</b> {txt(row.CodeMelli)}</span><span><b>استان:</b> {txt(row.NameOstan)}</span><span><b>حوزه انتخابیه:</b> {txt(row.NameHozeh)}</span><span><b>شهرستان:</b> {txt(row.CountyName)}</span><span><b>شماره ارجاع:</b> {txt(row.CountyReferralId)}</span><span><b>تاریخ ارجاع:</b> {date(row.CreatedAtUtc)}</span><span className={s.metaDescription}><b>توضیحات:</b> {txt(row.Description)}</span>{working?<button type="button" className={s.greenButton} disabled={!canSendToHoze||busy} onClick={()=>void openFinal()} title={!canSendToHoze?"ارسال بعد از ثبت جمع‌بندی نهایی همه محققان و اتمام همه مأموریت‌ها فعال می‌شود.":"بازبینی و ویرایش جمع‌بندی محققان برای ارسال پرونده"}>ارسال پرونده به حوزه انتخابیه</button>:isSent?<><span className={s.metaState}>ارسال‌شده به حوزه انتخابیه</span><button type="button" className={s.outlineButton} onClick={()=>void openSentReport()}>مشاهده متن ارسال‌شده</button></>:<span className={s.metaState}>{canStart?"در انتظار شروع":txt(row.StateCode)}</span>}{canStart&&<button className={s.addButton} disabled={busy} onClick={()=>void act("/Api/TahghighV2/CountyAction",{countyReferralId:ref,actionCode:"COUNTY_START",description:"شروع رسیدگی شهرستان به پرونده ارجاعی"},"بررسی شهرستان آغاز شد.")}>شروع بررسی پرونده</button>}</div>
 {working&&pendingCount===0&&completedCount===0&&!assignmentError&&<div className={s.warning}>پس از ثبت نهایی تصویر جمع‌بندی دست‌کم یک محقق، امکان ارسال پرونده به حوزه فعال می‌شود.</div>}
 {canStart&&<div className={s.warning}>برای ثبت مأموریت محقق ابتدا «شروع بررسی پرونده» را انتخاب کنید.</div>}
 <section className={`${s.referralPanel} ${s.investigatorPanel}`}>
  <div className={s.panelHeading}>
   <button type="button" className={s.panelTitle} aria-expanded={expanded.investigators}
    onClick={()=>setExpanded(x=>({...x,investigators:!x.investigators}))}>
    <span className={s.chevron}>{expanded.investigators?"▾":"▸"}</span>
    <strong>ارجاع به محقق ویژه شهرستان</strong>
    <span className={s.countGray} title="تعداد انتساب‌ها">{assignments.length.toLocaleString("fa-IR")}</span>
    <span className={s.countGreen} title="تحقیقات تکمیل‌شده">{assignments.filter(x=>String(x.StatusCode)==="DONE").length.toLocaleString("fa-IR")}</span>
   </button>
   {working && <button type="button" className={s.addButton} disabled={busy} onClick={()=>void openAssign()}>⊕ ارجاع به محقق</button>}
  </div>
  {expanded.investigators&&<div className={s.panelBody}>
   {assignmentError&&<div role="alert" className={s.error}>دریافت محققان شهرستان: {assignmentError} <button type="button" className={s.outlineButton} disabled={loading} onClick={()=>ref!==null&&void loadAssignments(ref)}>تلاش مجدد</button></div>}
   {loading&&<p className={s.hint}>در حال بارگذاری محققان…</p>}
   {!loading&&!assignmentError&&assignments.length===0&&<p className={s.hint}>در این پرونده هنوز محققی از سوی شهرستان تعیین نشده است.</p>}
   <div className={`${s.childList} ${s.investigatorList}`}>
    {assignments.map((a,i)=>{
     const id=num(a.AssignmentId);
     const isOpen=worksheetId===id;
     const canRecall=working&&active(a);
     return <article key={id} className={`${s.childCard} ${s.investigatorCard}`}>
      <span className={s.childIndex}>{(i+1).toLocaleString("fa-IR")}</span>
      <div className={s.childContent}>
       <div className={s.childTitleRow}>
        <strong>{txt(a.FullName??a.InvestigatorKey)}</strong>
        <span className={s.investigatorStatus}><StateChip value={a.StatusCode}/></span>
       </div>
       <div className={s.childMeta}>
        <span>تعداد کاربرگ‌ها: {num(a.WorksheetCount).toLocaleString("fa-IR")}</span>
        <span>شناسه انتساب: {txt(a.AssignmentId)}</span>
       </div>
       <div className={s.investigatorActions}>

        <button type="button" className={s.linkButton} aria-expanded={isOpen}
          onClick={()=>setWorksheetId(isOpen?null:id)}>
          {isOpen?"بستن جزئیات و کاربرگ‌ها":"جزئیات، کاربرگ‌ها و جمع‌بندی"}
        </button>
        {canRecall&&<button type="button" className={s.linkButton}
          onClick={()=>{setCancelId(id);setReason("")}}>بازپس‌گیری محقق</button>}
       </div>
       {!working&&active(a)&&<p className={s.permissionHint}>ثبت کاربرگ برای وضعیت فعلی پرونده مجاز نیست.</p>}
      </div>
      {isOpen&&<div className={s.worksheetHolder}>
       <ProvinceInvestigatorWorksheetEditor
        key={id}
        assignmentId={id}
        investigatorName={String(a.FullName??a.InvestigatorKey??"")}
        assignmentStatus={String(a.StatusCode)}
        scope="COUNTY"
        canManage={working}
        onSaved={async()=>{if(ref!==null)await loadAssignments(ref)}}
       />
      </div>}
     </article>;
    })}
   </div>
  </div>}
 </section>
 {/* The former full-width "ارسال نتیجه شهرستان به حوزه انتخابیه" panel is removed.
     Keep the already-existing submit workflow accessible through the case header. */}
 {finalModal&&<div className={s.modalOverlay} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy&&!hasReplyEdits)setFinalModal(false)}}>
   <section className={`${s.modal} ${s.countyReplyModal}`} role="dialog" aria-modal="true" aria-labelledby="county-final-title">
     <div className={s.modalHeader}>
       <div><strong id="county-final-title">{isSent?"متن نهایی ارسال‌شده به حوزه انتخابیه":"جمع‌بندی محققان و ارسال پرونده به حوزه انتخابیه"}</strong>
         <p className={s.replyHeaderHint}>{isSent?"این گزارش قبلاً ثبت و به حوزه انتخابیه ارسال شده است؛ فقط امکان مشاهده و کپی متن وجود دارد.":"متن همه محققان به‌ترتیب در یک کادر قابل‌ویرایش قرار دارد و به‌عنوان خروجی همین پرونده ثبت می‌شود."}</p></div>
       <button type="button" className={s.modalClose} aria-label="بستن" disabled={busy} onClick={async()=>{
         if(hasReplyEdits&&!await meratConfirm("ویرایش‌های ذخیره‌نشده کنار گذاشته شوند؟"))return;
         setFinalModal(false);
       }}>×</button>
     </div>
     <div className={s.modalBody}>
       {replyError&&<div className={s.error} role="alert">{replyError}</div>}
       {replyNotice&&<div className={s.replySuccess} role="status">{replyNotice}</div>}
       {replyLoading?<p className={s.hint}>در حال دریافت جمع‌بندی‌های ثبت‌شده محققان…</p>:
        !isSent&&replyItems.length===0?<p className={s.hint}>هیچ جمع‌بندی نهایی برای این شهرستان یافت نشد.</p>:
        <div className={s.replyInvestigatorCard}>
          <label htmlFor="county-unified-report" className={s.replyInvestigatorHeader}>
            <strong>متن خروجی یکپارچه پرونده</strong>
            <span className={isSent||repliesReady?s.replyReady:s.replyNotReady}>{isSent?"ارسال‌شده · فقط خواندنی":repliesReady?"تمام جمع‌بندی‌ها تأیید شده‌اند":"برخی جمع‌بندی‌ها هنوز نهایی نشده‌اند"}</span>
          </label>
          <textarea id="county-unified-report" aria-label="متن نهایی جمع‌بندی محققان جهت ارسال به حوزه"
            className={`${s.field} ${s.replyReportTextarea}`}
            dir="rtl" spellCheck={false} rows={8} maxLength={80000} readOnly={isSent} disabled={busy||(!isSent&&!repliesReady)}
            value={replyReport} onChange={e=>{if(!isSent){setReplyReport(e.target.value);setReplyNotice("");}}}
            placeholder={"۱. نام و نام خانوادگی — محقق شهرستان\nمتن جمع‌بندی"}/>
          <div className={s.replyMeta}>
            <span>{replyReport.trim().length.toLocaleString("fa-IR")} / ۸۰٬۰۰۰ نویسه</span>
            <span>{isSent?"نسخه نهاییِ ارسال‌شده (غیرقابل‌ویرایش)":hasReplyEdits?"ویرایش ذخیره‌نشده":replyExists?"نسخه خروجی در سامانه ذخیره شده":"متن پیشنهادی آماده ذخیره"}</span>
          </div>
        </div>}
       {!isSent&&<p className={s.hint}>جمع‌بندی‌ها با نام و شماره محقق در یک متن واحد قرار می‌گیرند. متن و تصویر اصلی فرم جمع‌بندی هر محقق تغییر نمی‌کند.</p>}
     </div>
     <div className={s.modalActions}>
       {isSent?<button type="button" className={s.cancelButton} onClick={()=>setFinalModal(false)}>بستن</button>:<>
       <button type="button" className={s.primary} disabled={busy||replyLoading||!repliesValid||!canSendToHoze}
         onClick={()=>void persistReply(true)}>{busy?"در حال ثبت…":"ثبت متن خروجی و ارسال به حوزه"}</button>
       <button type="button" className={s.greenButton} disabled={busy||replyLoading||!repliesValid||!canSendToHoze}
         onClick={()=>void persistReply(false)}>ذخیره متن خروجی</button>
       <button type="button" className={s.cancelButton} disabled={busy} onClick={async()=>{
         if(hasReplyEdits&&!await meratConfirm("ویرایش‌های ذخیره‌نشده کنار گذاشته شوند؟"))return;
         setFinalModal(false);
       }}>انصراف</button>
       </>}
     </div>
   </section>
 </div>}
 {assignModal && <div
   className={s.modalOverlay}
   role="presentation"
   onMouseDown={e=>{if(e.target===e.currentTarget && !busy)setAssignModal(false)}}
 >
   <section className={s.modal} role="dialog" aria-modal="true" aria-labelledby="county-assign-title">
     <div className={s.modalHeader}>
       <strong id="county-assign-title">ارجاع به محقق ویژه شهرستان</strong>
       <button type="button" className={s.modalClose} aria-label="بستن" disabled={busy} onClick={()=>setAssignModal(false)}>×</button>
     </div>
     <div className={s.modalBody}>
       {candidateError && <div className={s.error} role="alert">
         دریافت فهرست محققان: {candidateError}
         <button type="button" className={s.outlineButton} disabled={candidateLoading||busy} onClick={()=>void openAssign()}>تلاش مجدد</button>
       </div>}
       <label className={s.label} id="county-investigator-label">انتخاب محقق</label>
       <div className={s.investigatorSearchWrap}>
         <SearchableDropdown<string>
           value={investigator||null}
           onChange={setInvestigator}
           options={candidatesAvailable.map(x=>({
             value:String(x.PersonId),
             label:String(x.FullName||`محقق ${txt(x.PersonId)}`),
             description:x.CountyName?String(x.CountyName):undefined,
             searchText:`${txt(x.FullName)} ${txt(x.CountyName)} ${txt(x.PersonId)}`,
             disabled:x.IsAssignable===false||x.IsAssignable===0||x.IsAssignable==="0",
           }))}
           placeholder="انتخاب یا جست‌وجوی محقق..."
           searchPlaceholder="جست‌وجو بر اساس نام یا شهرستان..."
           emptyText="محقق جدیدی برای ارجاع وجود ندارد."
           noResultText="محققی با این عبارت پیدا نشد."
           loading={candidateLoading}
           loadingText="در حال دریافت فهرست محققان..."
           disabled={busy||Boolean(candidateError)}
           compact
           containInDialog
           menuMaxHeight={228}
           itemFontSize="12.5px"
           ariaLabel="انتخاب محقق ویژه شهرستان"
         />
       </div>
       {!candidateLoading&&!candidateError&&candidatesAvailable.length===0&&<p className={s.hint}>
         محقق قابل انتساب جدیدی وجود ندارد؛ محققان قبلاً ارجاع‌شده دوباره نمایش داده نمی‌شوند.
       </p>}
       <label className={s.label}>مهلت انجام (شمسی)</label>
       <div className={s.dateBox}>
         <InputPersianDate value={dueDate||null} onChange={v=>setDueDate(v||"")} allowPastDates={false}/>
       </div>
       <label className={s.label} htmlFor="county-investigator-instruction">شرح مأموریت</label>
       <textarea
         id="county-investigator-instruction"
         className={`${s.field} ${s.modalTextarea}`}
         rows={4}
         maxLength={6000}
         value={instruction}
         onChange={e=>setInstruction(e.target.value)}
         placeholder="شرح مأموریت محقق را وارد کنید..."
       />
     </div>
     <div className={s.modalActions}>
       <button type="button" className={s.primary}
         disabled={busy||candidateLoading||Boolean(candidateError)||!investigator||!instruction.trim()}
         onClick={async()=>{
           if(await act("/Api/TahghighV2/CountyAssignInvestigator",{
             countyReferralId:ref,personId:Number(investigator),instruction:instruction.trim(),dueDatePersian:dueDate||null
           },"ارجاع محقق ثبت شد.")){
             setAssignModal(false);
             setInvestigator("");
             setInstruction("");
           }
         }}
       >{busy?"در حال ثبت...":"تأیید ارجاع"}</button>
       <button type="button" className={s.cancelButton} disabled={busy} onClick={()=>setAssignModal(false)}>انصراف</button>
     </div>
   </section>
 </div>}
 {cancelId!==null&&<div role="presentation" style={{position:"fixed",inset:0,background:"#0f172a9c",zIndex:1500,display:"grid",placeItems:"center"}}><section role="dialog" aria-modal="true" aria-label="بازپسگیری محقق" style={{background:"white",padding:20,borderRadius:14,width:"min(550px,95vw)",display:"grid",gap:12}}><h3>بازپسگیری محقق</h3><label>دلیل بازپسگیری<textarea rows={4} value={reason} style={{width:"100%"}} onChange={e=>setReason(e.target.value)}/></label><button className={s.yellowButton} disabled={busy||!reason.trim()} onClick={async()=>{if(await meratConfirm("محقق بازپسگیری شود؟")&&await act("/Api/TahghighV2/CountyCancelAssignment",{assignmentId:cancelId,reason:reason.trim()},"محقق بازپسگیری شد."))setCancelId(null)}}>تأیید بازپسگیری</button><button className={s.outlineButton} onClick={()=>setCancelId(null)}>انصراف</button></section></div>}
 
 </>}
 </main>;
}
