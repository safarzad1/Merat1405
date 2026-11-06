"use client";
/* The original province's Tajmi form, ported from
 * ParvandehOstan/[KeyData]/page.tsx (questions/radioItems and the two official sheets).
 * Only the persistence adapter is V2; applicant data and access are server-scoped. */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import domtoimage from "@/lib/domToImageCompat";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import SummaryAttachmentsPanel from "./SummaryAttachmentsPanel";
import s from "./ProvinceLegacySummaryForm.module.css";

// Original seven option groups and eight questions, unchanged in substance.
const radioItems = [
  ["معتقد و ملتزم", "غیرعامل و در تقابل", "کاهل و دارای رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
  ["عامل و ملتزم", "غیرعامل و در تقابل", "کاهل و دارای رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
  ["مدافع و همسو با نظام", "مخالف و در تقابل", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
  ["عامل و ملتزم", "غیرعامل و در تقابل", "کاهل و دارای رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
  ["معتقد و ملتزم", "غیر عامل و در تقابل", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
  ["عامل و ملتزم به مسائل شرعی و قانونی", "غیر عامل و در تقابل با مسائل شرعی و قانونی", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
  ["عامل و ملتزم", "غیرعامل و در تقابل", "رفتار و مواضع دوگانه", "بی تفاوت", "نامشخص"],
];
const questions = [
  "۱. اعتقاد و التزام عملی داوطلب به مسائل دینی، اعتقادی و عبادی:",
  "۲. وضعیت داوطلب در حوزه مسائل اخلاقی، رفتاری و شخصیتی:",
  "۳. التزام عملی داوطلب به نظام مقدس جمهوری اسلامی ایران و مواضع و عملکرد وی در حوزه مسائل سیاسی و امنیتی:",
  "۴. ابراز وفاداری و مواضع و عملکرد داوطلب نسبت به اصل ولایت مطلقه فقیه و میزان پایبندی وی به دستورات، سیاست‌ها و منویات مقام معظم رهبری:",
  "۵. ابراز وفاداری و میزان پایبندی داوطلب به قوانین و مقررات کشور (قانون اساسی و قوانین عادی):",
  "۶. وضعیت داوطلب در حوزه مسائل اقتصادی و مالی:",
  "۷. وضعیت خانواده، بستگان درجه یک / سببی و نسبی، دوستان و معاشرین داوطلب ... :",
  "۸. ویژگی‌ها، موفقیت‌ها یا خدمات برجسته داوطلب که در مقایسه با افراد مشابه واجد ارزش بوده و به‌صورت مستقیم یا غیرمستقیم می‌تواند منجر به خدمت به جامعه گردد:",
];
const blanks = () => Array<string>(8).fill("");
const choicesBlank = () => Array<number>(7).fill(-1);
const text = (value: unknown): string => value == null || String(value).trim() === "" ? "—" : String(value);
const num = (value: unknown): number => Number(value ?? 0) || 0;

/** Original province form: four year boxes / ten national-code boxes, one digit per cell. */
function LegacyDigitBoxes({value, length}: {value: unknown; length: 4 | 10}) {
  const raw = value == null ? "" : String(value).replace(/[^0-9۰-۹٠-٩]/g, "");
  const digits = Array.from(raw).slice(0, length);
  return <span className={`${s.digitBoxes} ${length === 4 ? s.yearBoxes : s.nationalCodeBoxes}`}
    dir="ltr" aria-label={raw || "ثبت نشده"}>
    {Array.from({length}, (_, index) => <span className={s.digitBox} key={index}>
      {digits[index] || ""}
    </span>)}
  </span>;
}
const date = () => new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
}).format(new Date()).replace(/[\u200e\u200f]/g, "");

type Continuation = {label: string; text: string};
const SUMMARY_HEADING = "جمع‌بندی تحقیقات صورت‌گرفته بر اساس مهم‌ترین موارد درج‌شده در کاربرگ‌های تحقیق:";

/** Split without omitting text. Pages are refined using their actual rendered heights. */
function cutText(source: string, limit: number): [string, string] {
  if (source.length <= limit) return [source, ""];
  if (limit <= 0) return ["", source];
  const idx = source.lastIndexOf(" ", limit);
  const cut = idx > limit * 0.7 ? idx : limit;
  return [source.slice(0, cut), source.slice(cut)];
}
function continuationPages(items: Continuation[], budget: number): Continuation[][] {
  const pages: Continuation[][] = [];
  let page: Continuation[] = [];
  let used = 0;
  for (const item of items) {
    let remaining = item.text;
    while (remaining) {
      if (used >= budget && page.length) { pages.push(page); page = []; used = 0; }
      const [part, tail] = cutText(remaining, Math.max(1, budget - used));
      page.push({label: item.label, text: part});
      used += part.length;
      remaining = tail;
      if (remaining) { pages.push(page); page = []; used = 0; }
    }
  }
  if (page.length) pages.push(page);
  return pages;
}
/**
 * The eight questions belong to the first sheet; the FINAL summary is NEVER
 * placed on it. When explanations are unusually long, their continuation pages
 * are inserted before the separate summary sheet, so the reading order is intact.
 * With normal-sized answers, the summary starts on page 2. Its own long text
 * always flows into additional real pages (3, 4, ...), without clipping.
 */
function pageParts(answers: string[], finalText: string, firstPageBudget = 1700, continuationBudget = 1800) {
  let available = firstPageBudget;
  const firstAnswers: string[] = [];
  const questionOverflow: Continuation[] = [];
  for (let i = 0; i < 8; i++) {
    const [first, rest] = cutText(answers[i] || "", Math.max(0, available));
    firstAnswers.push(first);
    available = Math.max(0, available - first.length);
    if (rest) questionOverflow.push({label: `ادامه توضیحات سؤال ${i + 1}`, text: rest});
  }
  const questionPages = continuationPages(questionOverflow, continuationBudget);
  const summaryPages = continuationPages([{label: SUMMARY_HEADING, text: finalText}], continuationBudget);
  if (!summaryPages.length) summaryPages.push([{label: SUMMARY_HEADING, text: ""}]);
  return {firstAnswers, questionPages, summaryPages};
}

type ProvinceWorksheetStat = {
  WorksheetId?: number | string;
  TypeMahalTahghigh?: number | string | null;
  TahghighType?: number | string | null;
  PeyvastCount?: number | string | null;
};

function PrintSheets({idPrefix, identity, preparedByName, preparedByTitle, preparedByProvince, worksheets, worksheetStatsReady, attachmentPageCount, selected, answers, summary, firstPageBudget,
  onAttachmentPageCount,
  continuationBudget = 1800, editable = false, canEdit = false, onSelect, onAnswer, onSummary}: {
 idPrefix:string; identity:V2Row|null; preparedByName:string; preparedByTitle:string; preparedByProvince:string;
 worksheets:ProvinceWorksheetStat[]; worksheetStatsReady:boolean; attachmentPageCount:number|null;
 selected:number[]; answers:string[]; summary:string; firstPageBudget:number; continuationBudget?:number;
 editable?:boolean; canEdit?:boolean;
 onSelect?:(question:number,option:number)=>void;
 onAnswer?:(question:number,value:string)=>void;
 onSummary?:(value:string)=>void;
 onAttachmentPageCount?:(value:number)=>void;
}) {
  const parts=useMemo(()=>pageParts(answers,summary,firstPageBudget,continuationBudget),[answers,summary,firstPageBudget,continuationBudget]);
  // Codes and grouping follow the original ParvandehOstan sheet.
  // Never substitute assignment/referral counts for the actual worksheet types.
  const worksheetCount=worksheetStatsReady ? worksheets.length : null;
  const countBy=(key:"TypeMahalTahghigh"|"TahghighType",value:number) =>
    worksheetStatsReady ? worksheets.filter(w=>Number(w[key])===value).length : null;
  const workPlace=countBy("TypeMahalTahghigh",1);
  const studyPlace=countBy("TypeMahalTahghigh",2);
  const livingPlace=countBy("TypeMahalTahghigh",3);
  const completeReports=countBy("TahghighType",1);
  const limitedReports=countBy("TahghighType",2);
  const fileReviewReports=countBy("TahghighType",3);
  const sumAttachments=worksheetStatsReady
    ? worksheets.reduce((sum,w)=>sum+Math.max(0,num(w.PeyvastCount)),0) : null;
  const attachments=attachmentPageCount ?? sumAttachments;
  const stat=(value:number|null)=>value===null?"—":value.toLocaleString("fa-IR");
  const dateNow=date();
  // Print the name and position of the province office user, not the applicant.
  const signerName=preparedByName.trim() || "—";
  const signerTitle=preparedByTitle.trim() || "کارشناس واحد اسناد و بررسی استان";
  const province=String(preparedByProvince || identity?.NameOstan || "")
    .trim().replace(/^(?:دفتر\s+)?استان\s+/u, "");
  const signerRole=province && !signerTitle.includes(province)
    ? `${signerTitle}${signerTitle.includes("استان") ? " " : " استان "}${province}`
    : signerTitle;
  const signedBy=`${signerName} — ${signerRole}`;
  return <div className={`${s.sheetStack} ${editable ? s.editStack : ""}`} dir="rtl">
    <article className={s.sheet} id={`${idPrefix}-0`}>
      <header className={s.header}>
        <div className={s.logo}><img src="/logo/KarbargOstan/mohr.jpg" alt="مهر فرم استان" /></div>
        <div className={s.logoMain}><img src="/logo/KarbargOstan/toplogo.png" alt="عنوان رسمی کاربرگ جمع‌بندی استان"/></div>
        <div className={s.headerMeta}>شماره سریال: .................<p>استان: {text(identity?.NameOstan)}</p><p>حوزه انتخابیه: {text(identity?.NameHozeh)}</p></div>
      </header>
      <section className={s.panel} aria-label="مشخصات داوطلب">
        <strong className={s.sideHeading}>مشخصات داوطلب</strong>
        <div className={s.fieldRows}>
          <div className={s.fieldRow}>
            <span>نام: <b>{text(identity?.FirstName)}</b></span>
            <span>نام خانوادگی: <b>{text(identity?.LastName)}</b></span>
            <span>نام مشهور/مستعار: <b>{text(identity?.NameMostar)}</b></span>
            <span>نام پدر: <b>{text(identity?.NamePedar)}</b></span>
            <span className={s.numberField}>سال تولد: <LegacyDigitBoxes value={identity?.SalTavalod} length={4} /></span>
            <span>دین - مذهب: <b>{text(identity?.DinMazhab_NameFarsi)}</b></span>
          </div>
          <div className={s.fieldRow}>
            <span className={s.numberField}>شماره ملی: <LegacyDigitBoxes value={identity?.CodeMelli} length={10} /></span>
            <span>شغل: <b>{text(identity?.Shoghl)}</b></span>
            <span>تحصیلات: <b>{text(identity?.Tahsilat)}</b></span>
            <span>سابقه داوطلبی: <b>{text(identity?.Sabeghe)}</b></span>
          </div>
        </div>
      </section>
      <section className={s.panel} aria-label="مشخصات تحقیقات">
        <strong className={s.sideHeading}>مشخصات تحقیقات</strong>
        <div className={s.fieldRows}>
          <div className={s.fieldRow}>
            <span>تعداد کل منابع تحقیق‌شده: <b>{stat(worksheetCount)}</b></span>
            <span>محل کار: <b>{stat(workPlace)}</b></span>
            <span>محل تحصیل: <b>{stat(studyPlace)}</b></span>
            <span>محل زندگی: <b>{stat(livingPlace)}</b></span>
            <span className={s.attachmentCounter}>تعداد پیوست:
              {editable && canEdit ? <input type="number" min={0} max={9999} step={1}
                className={s.attachmentCountInput} aria-label="تعداد صفحات پیوست"
                value={attachments ?? ""}
                onChange={e=>{const n=Number(e.target.value);if(e.target.value!==""&&Number.isSafeInteger(n)&&n>=0&&n<=9999)onAttachmentPageCount?.(n);}} />
              : <b className={s.attachmentCountValue}>{stat(attachments)}</b>}
              صفحه
            </span>
          </div>
          <div className={s.fieldRow}>
            <span className={s.worksheetHeading}>تعداد کاربرگ‌ها و شماره سریال آن‌ها:</span>
            <span>تحقیق از داوطلب: <b>۰</b></span>
            <span>تحقیق کامل ۳ برگی: <b>{stat(completeReports)}</b></span>
          </div>
          <div className={s.fieldRow}>
            <span>گزارش تحقیق محدود: <b>{stat(limitedReports)}</b></span>
            <span className={s.dottedResearchLine} aria-hidden="true" />
            <span>بازخوانی پرونده: <b>{stat(fileReviewReports)}</b></span>
            <span className={s.dottedResearchLine} aria-hidden="true" />
          </div>
        </div>
      </section>
      <section className={s.questions}>
        {questions.map((question, i)=><div className={s.question} key={i}>
          <strong>{question}</strong>
          {i<7 && <div className={s.optionRow}>{radioItems[i].map((option,j)=>editable ?
            <label key={j} className={`${s.option} ${s.editableOption}`}>
              {option}<input type="radio" name={`province-sheet-option-${idPrefix}-${i}`}
                checked={selected[i]===j} disabled={!canEdit}
                onChange={()=>onSelect?.(i,j)} aria-label={option}/>
            </label> : <span key={j} className={s.option}>
              {option}<span className={`${s.circle} ${selected[i]===j?s.checked:""}`} />
            </span>)}</div>}
          <label className={s.answerLabel} htmlFor={editable ? `${idPrefix}-answer-${i}` : undefined}>
            توضیح با ذکر مصادیق:
          </label>
          {editable ? <textarea id={`${idPrefix}-answer-${i}`} className={s.sheetTextArea}
            rows={2} maxLength={6000} value={answers[i]||""} disabled={!canEdit}
            placeholder="توضیح این سؤال را وارد کنید…" onChange={e=>onAnswer?.(i,e.target.value)}/>
          : <p className={s.answerText}>{parts.firstAnswers[i] || " "}</p>}
        </div>)}
        {editable && <div className={s.question}>
          <label htmlFor={`${idPrefix}-summary`}><strong>{SUMMARY_HEADING}</strong></label>
          <textarea id={`${idPrefix}-summary`} className={s.sheetTextArea}
            rows={4} maxLength={12000} value={summary} disabled={!canEdit}
            placeholder="متن جمع‌بندی نهایی را وارد کنید…" onChange={e=>onSummary?.(e.target.value)}/>
        </div>}
      </section>
      <footer className={s.footer}><span>{signedBy}</span><span>تاریخ: {dateNow}</span><span>امضا: ..................</span></footer>
    </article>
    {!editable && parts.questionPages.map((entries,i)=><article className={s.sheet}
      data-print-kind="question-continuation" id={`${idPrefix}-${i+1}`} key={`questions-${i}`}>
      <header className={s.continuationHeader}>
        <strong>ادامه پاسخ‌های تشریحی کاربرگ تحقیقات استان</strong>
        <span>صفحه {(i+2).toLocaleString("fa-IR")}</span>
      </header>
      <div className={s.continuationContent}>{entries.map((entry,j)=><section key={j}>
        <strong>{entry.label}</strong><p className={s.answerText}>{entry.text}</p>
      </section>)}</div>
      <footer className={s.footer}><span>{signedBy}</span>
        <span>تاریخ: {dateNow}</span><span>امضا: ..................</span>
      </footer>
    </article>)}
    {!editable && parts.summaryPages.map((entries,i)=><article className={s.sheet}
      data-print-kind="final-summary" id={`${idPrefix}-${parts.questionPages.length+i+1}`} key={`summary-${i}`}>
      <div className={s.finalSummaryPanel}>
        <strong className={s.finalSummaryHeading}>{i === 0 ? SUMMARY_HEADING : "ادامه جمع‌بندی تحقیقات صورت‌گرفته بر اساس مهم‌ترین موارد درج‌شده در کاربرگ‌های تحقیق:"}</strong>
        <div className={s.finalSummaryBody}>
          {entries.map((entry,j)=><p key={j} className={s.finalSummaryText}>{entry.text || " "}</p>)}
        </div>
        <footer className={s.finalSummaryFooter}>
          <span>{signedBy}</span>
          <span>تاریخ: {dateNow}</span><span>امضا: .................</span>
        </footer>
      </div>
    </article>)}
  </div>;
}

async function imageFile(node: HTMLElement, referralId: number, page: number): Promise<File> {
  const scale=1.3;
  const width=node.scrollWidth, height=node.scrollHeight;
  const pngData=await domtoimage.toPng(node,{ width:width*scale,height:height*scale, bgcolor:"#fff",
    style:{transform:`scale(${scale})`,transformOrigin:"top left",width:`${width}px`,height:`${height}px`}});
  const png=await (await fetch(pngData)).blob();
  if(png.size<=3*1024*1024) return new File([png],`JambandiOstan_${referralId}_${page}.png`,{type:"image/png"});
  const bitmap=await createImageBitmap(png);
  try {
    const canvas=document.createElement("canvas");canvas.width=bitmap.width;canvas.height=bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap,0,0);
    for(const quality of [0.9,0.78,0.64]) {
      const jpg=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(jpg && jpg.size<=3*1024*1024) return new File([jpg],`JambandiOstan_${referralId}_${page}.jpg`,{type:"image/jpeg"});
    }
    throw new Error("حجم تصویر برگه بیشتر از حد مجاز است.");
  } finally {bitmap.close();}
}

export default function ProvinceLegacySummaryForm({referralId, identity, preparedByName, preparedByTitle, preparedByProvince, assignments, children, canEdit, summaryId, attachmentReadOnly, onSaved, canSendToDirector, onSendToDirector, sendingToDirector = false}: {
 referralId:number;identity:V2Row|null;preparedByName:string;preparedByTitle:string;preparedByProvince:string;assignments:V2Row[];children:V2Row[];canEdit:boolean;
 summaryId:number|null;attachmentReadOnly:boolean;onSaved:(finalized:boolean)=>Promise<void>;
 canSendToDirector:boolean;onSendToDirector:()=>void;sendingToDirector?:boolean;
}) {
  const [selected,setSelected]=useState(choicesBlank);
  const [answers,setAnswers]=useState(blanks);
  const [summary,setSummary]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [savedForm,setSavedForm]=useState(false);
  const [dirty,setDirty]=useState(false);
  const [previewOpen,setPreviewOpen]=useState(false);
  const [finalized,setFinalized]=useState(false);
  const [currentSummaryId,setCurrentSummaryId]=useState<number|null>(summaryId);
  const printRef=useRef<HTMLDivElement>(null);
  const [firstPageBudget,setFirstPageBudget]=useState(1700);
  const [continuationBudget,setContinuationBudget]=useState(1800);
  const [worksheets,setWorksheets]=useState<ProvinceWorksheetStat[]>([]);
  const [worksheetStatsReady,setWorksheetStatsReady]=useState(false);
  const [worksheetStatsError,setWorksheetStatsError]=useState("");
  // A separate print-only page count was present in the original form.
  // NULL means use the sum of the worksheet-declared attachment pages.
  const [attachmentPageCount,setAttachmentPageCount]=useState<number|null>(null);
  const assignmentIds=useMemo(()=>assignments.filter(a=>String(a.StatusCode)!=="CANCELLED")
    .map(a=>Number(a.AssignmentId))
    .filter(id=>Number.isSafeInteger(id)&&id>0).join(","),[assignments]);
  useEffect(()=>{
    let active=true;
    const ids=assignmentIds.split(",").map(Number).filter(id=>id>0);
    setWorksheetStatsReady(false);setWorksheetStatsError("");
    if(!ids.length){setWorksheets([]);setWorksheetStatsReady(true);return()=>{active=false;};}
    void Promise.allSettled(ids.map(id=>meratV2Request(`/Api/TahghighV2/ProvinceInvestigatorWorksheet?assignmentId=${id}`)))
      .then(results=>{
        if(!active)return;
        if(results.some(result=>result.status==="rejected")){
          setWorksheets([]);setWorksheetStatsError("آمار کاربرگ‌های استان به‌طور کامل دریافت نشد؛ تعدادهای نامشخص با خط تیره نمایش داده می‌شوند.");
          return;
        }
        setWorksheets(results.flatMap(result=>result.status==="fulfilled"?result.value:[]) as ProvinceWorksheetStat[]);
        setWorksheetStatsReady(true);
      });
    return()=>{active=false;};
  },[assignmentIds]);
  useEffect(() => {
    if (!previewOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setPreviewOpen(false); };
    window.addEventListener("keydown",closeOnEscape);
    return () => window.removeEventListener("keydown",closeOnEscape);
  },[previewOpen]);
  useEffect(()=>{let active=true;setLoading(true);setError("");
    setDirty(false);
    void meratV2Request(`/Api/TahghighV2/ProvinceLegacySummary?referralId=${referralId}`)
      .then(rows=>{
        if(!active)return;
        const item=rows[0];
        if(item?.FormDataJson) {
          const data=JSON.parse(String(item.FormDataJson)) as {selected?:number[];answers?:string[];summary?:string;attachmentPageCount?:number|null};
          if(Array.isArray(data.selected)&&data.selected.length===7)setSelected(data.selected);
          if(Array.isArray(data.answers)&&data.answers.length===8)setAnswers(data.answers);
          setAttachmentPageCount(typeof data.attachmentPageCount === "number" &&
            Number.isSafeInteger(data.attachmentPageCount) && data.attachmentPageCount >= 0 && data.attachmentPageCount <= 9999
            ? data.attachmentPageCount : null);
          setSummary(String(data.summary??item?.SummaryText??""));setSavedForm(true);setFinalized(Boolean(item?.IsFormFinalized));setFirstPageBudget(1700);setContinuationBudget(1800);
        } else {
          setAttachmentPageCount(null);
          setSummary(String(item?.SummaryText??""));setSelected(choicesBlank());setAnswers(blanks());setSavedForm(false);setFinalized(false);setFirstPageBudget(1700);setContinuationBudget(1800);
        }
        const id=Number(item?.SummaryId??0);
        if(id>0)setCurrentSummaryId(id);
      })
      .catch(e=>{if(active)setError(e instanceof Error?e.message:"دریافت فرم جمع‌بندی انجام نشد.");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[referralId]);
  const validate=useCallback(()=>{
    for(let i=0;i<7;i++) if(!Number.isInteger(selected[i])||selected[i]<0||selected[i]>=radioItems[i].length)
      return `گزینه سؤال ${i+1} را انتخاب کنید.`;
    for(let i=0;i<8;i++) if(!answers[i]?.trim())return `توضیح سؤال ${i+1} را وارد کنید.`;
    if(!summary.trim())return "متن جمع‌بندی نهایی را وارد کنید.";
    return "";
  },[selected,answers,summary]);
  // Measure the actual offscreen print sheets. Shrink the text budgets until
  // every physical A4 sheet fits; NEVER just crop overflowing answer text.
  useEffect(()=>{
    if (loading) return;
    const raf=requestAnimationFrame(()=>{
      const nodes=Array.from(printRef.current?.querySelectorAll<HTMLElement>("article") || []);
      const first=nodes[0];
      if (!first) return;
      const firstHeight=first.getBoundingClientRect().height;
      if (firstHeight > 1765 && firstPageBudget > 0) {
        const next=Math.max(0, Math.floor(firstPageBudget * (1560 / firstHeight)) - 40);
        setFirstPageBudget(current=>Math.min(current, next));
      }
      // This covers both continued question answers and the separate summary
      // pages. The longest page determines the next per-page chunk size.
      const largest=nodes.slice(1).reduce((max,node)=>Math.max(max,node.getBoundingClientRect().height),0);
      if (largest > 1765 && continuationBudget > 1) {
        const next=Math.max(1,Math.floor(continuationBudget * (1560 / largest)) - 30);
        setContinuationBudget(current=>Math.min(current,next));
      }
    });
    return()=>cancelAnimationFrame(raf);
  },[answers,summary,selected,firstPageBudget,continuationBudget,loading,attachmentPageCount,worksheetStatsReady,worksheets]);
  const pages=useMemo(()=>{
    const parts=pageParts(answers,summary,firstPageBudget,continuationBudget);
    return 1+parts.questionPages.length+parts.summaryPages.length;
  },[answers,summary,firstPageBudget,continuationBudget]);
  const save=async(withImages:boolean)=>{
    if(!canEdit||busy)return;
    const message=validate();if(message){setError(message);return;}
    setBusy(true);setError("");setNotice("");
    try{
      await meratV2Request("/Api/TahghighV2/ProvinceLegacySummary",{
        referralId,selected,answers,summaryText:summary.trim(),attachmentPageCount,
      });
      setSavedForm(true);setFinalized(false);setDirty(false);
      await onSaved(false);
      if(!withImages){setNotice("فرم و پاسخ‌ها ذخیره شدند؛ تصویری تولید یا پیوست نشد.");return;}
      const [record]=await meratV2Request(`/Api/TahghighV2/ProvinceSummaryAttachmentTarget?referralId=${referralId}`);
      const targetId=Number(record?.SummaryId??0);
      if(!Number.isSafeInteger(targetId)||targetId<=0||!Boolean(record?.CanWrite))
        throw new Error("اطلاعات فرم ذخیره شد، اما اجازه ثبت تصویر جمع‌بندی در دسترس نیست.");
      setCurrentSummaryId(targetId);
      const uploadedIds:string[]=[];
      const root=printRef.current;
      if(!root)throw new Error("صفحات چاپ فرم پیدا نشدند.");
      const nodes=Array.from(root.querySelectorAll<HTMLElement>("article"));
      if (nodes.some(node=>node.getBoundingClientRect().height>1765)) {
        throw new Error("صفحه‌بندی فرم هنوز در حال تنظیم است. پیش‌نمایش را بررسی کرده و دوباره تأیید کنید.");
      }
      for(let i=0;i<nodes.length;i++){
        const file=await imageFile(nodes[i],referralId,i+1);
        const body=new FormData();body.append("targetEntity","PROVINCE_SUMMARY");body.append("targetRecordId",String(targetId));body.append("file",file);
        const res=await fetch("/Api/TahghighV2/DocumentAttachments",{method:"POST",body,credentials:"same-origin"});
        const payload=await res.json() as {ok?:boolean;message?:string;attachmentId?:string};
        if(!res.ok||!payload.ok||!payload.attachmentId)throw new Error(payload.message||"بارگذاری تصویر فرم موفق نبود.");
        uploadedIds.push(payload.attachmentId);
      }
      await meratV2Request("/Api/TahghighV2/ProvinceLegacySummaryFinalize",{referralId,attachmentIds:uploadedIds});
      setFinalized(true);
      await onSaved(true);
      setNotice(`فرم نهایی شد و ${nodes.length.toLocaleString("fa-IR")} صفحه تصویری به پیوست‌های جمع‌بندی اضافه شد.`);
    }catch(e){setError(e instanceof Error?e.message:"خطا در ذخیره فرم جمع‌بندی.");}
    finally{setBusy(false);}
  };
  return <div dir="rtl" className={s.root}>
    <div className={s.toolbar}>
      <strong>کاربرگ رسمی جمع‌بندی تحقیقات استان</strong>
      <span>{pages.toLocaleString("fa-IR")} صفحه</span>
    </div>
    {loading?<p>در حال دریافت اطلاعات فرم…</p>:<>
      {error&&<p role="alert" className={s.error}>{error}</p>}
      {notice&&<p role="status" className={s.success}>{notice}</p>}
      {worksheetStatsError&&<p role="status" className={s.info}>{worksheetStatsError}</p>}
      {!canEdit&&<p className={s.info}>تا زمان دریافت تمام پاسخ ارجاعات، فرم فقط قابل مشاهده است.</p>}
      <div className={s.actions}>
        <button type="button" disabled={busy} onClick={()=>setPreviewOpen(true)} aria-haspopup="dialog">پیش‌نمایش فرم</button>
        <button type="button" disabled={!canEdit||busy} onClick={()=>void save(false)}>{busy?"در حال ذخیره…":"ذخیره موقت پاسخ‌ها"}</button>
        <button type="button" className={s.primary} disabled={!canEdit||busy} onClick={()=>void save(true)}>{busy?"در حال ثبت…":"تأیید نهایی فرم و ثبت تصاویر"}</button>
        {finalized && !dirty && savedForm && canSendToDirector && <button type="button"
          className={s.sendDirector} disabled={busy || sendingToDirector} onClick={onSendToDirector}>
          {sendingToDirector ? "در حال ارسال…" : "ارسال به رئیس دفتر"}
        </button>}
        {dirty ? <span className={s.unsaved}>تغییرات این فرم هنوز ذخیره نشده‌اند؛ تأیید نهایی قبلی معتبر نیست.</span>
          : savedForm && <span className={s.saved}>{finalized?"فرم نهایی و تصویری ثبت شده است":"پاسخ‌ها ذخیره شده‌اند؛ هنوز نهایی نشده است"}</span>}
      </div>
      <p className={s.directEditHint}>سؤال‌ها را در همین فرم تکمیل کنید. پیش‌نمایش چاپی فقط با دکمه «پیش‌نمایش فرم» باز می‌شود و اطلاعات طولانی در تصاویر رسمی صفحه‌بندی خواهند شد.</p>
      <PrintSheets idPrefix={`province-edit-${referralId}`} identity={identity}
        preparedByName={preparedByName} preparedByTitle={preparedByTitle} preparedByProvince={preparedByProvince}
        worksheets={worksheets} worksheetStatsReady={worksheetStatsReady} attachmentPageCount={attachmentPageCount}
        selected={selected} answers={answers} summary={summary} firstPageBudget={firstPageBudget} continuationBudget={continuationBudget}
        editable canEdit={canEdit&&!busy}
        onAttachmentPageCount={value=>{setAttachmentPageCount(value);setDirty(true);setNotice("");}}
        onSelect={(i,j)=>{setSelected(p=>p.map((v,k)=>i===k?j:v));setDirty(true);setNotice("");setFirstPageBudget(1700);setContinuationBudget(1800);}}
        onAnswer={(i,value)=>{setAnswers(p=>p.map((v,k)=>k===i?value:v));setDirty(true);setNotice("");setFirstPageBudget(1700);setContinuationBudget(1800);}}
        onSummary={value=>{setSummary(value);setDirty(true);setNotice("");setFirstPageBudget(1700);setContinuationBudget(1800);}}/>
      {currentSummaryId!==null&&<div className={s.attachmentBlock}>
        <SummaryAttachmentsPanel level="PROVINCE" summaryRecordId={currentSummaryId} readOnly={!canEdit||busy||attachmentReadOnly}/>
      </div>}
      {previewOpen && <div className={s.previewOverlay} role="presentation"
        onMouseDown={e=>{if(e.currentTarget===e.target)setPreviewOpen(false);}}>
        <div className={s.previewDialog} role="dialog" aria-modal="true" aria-label="پیش‌نمایش فرم رسمی جمع‌بندی استان">
          <header className={s.previewHeader}>
            <strong>پیش‌نمایش فرم رسمی جمع‌بندی استان — {pages.toLocaleString("fa-IR")} صفحه</strong>
            <button type="button" onClick={()=>setPreviewOpen(false)}>بستن پیش‌نمایش ×</button>
          </header>
          {dirty && <p className={s.previewWarning}>این پیش‌نمایش شامل تغییرات ذخیره‌نشده است.</p>}
          <div className={s.previewBody}>
            <PrintSheets idPrefix={`province-preview-${referralId}`} identity={identity}
        preparedByName={preparedByName} preparedByTitle={preparedByTitle} preparedByProvince={preparedByProvince}
        worksheets={worksheets} worksheetStatsReady={worksheetStatsReady} attachmentPageCount={attachmentPageCount}
              selected={selected} answers={answers} summary={summary} firstPageBudget={firstPageBudget} continuationBudget={continuationBudget}/>
          </div>
        </div>
      </div>}
      <div ref={printRef} className={s.printStaging} aria-hidden="true">
        <PrintSheets idPrefix={`province-print-${referralId}`} identity={identity}
        preparedByName={preparedByName} preparedByTitle={preparedByTitle} preparedByProvince={preparedByProvince}
        worksheets={worksheets} worksheetStatsReady={worksheetStatsReady} attachmentPageCount={attachmentPageCount}
          selected={selected} answers={answers} summary={summary} firstPageBudget={firstPageBudget} continuationBudget={continuationBudget}/>
      </div>
    </>}
  </div>;
}
