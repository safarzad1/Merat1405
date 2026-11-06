"use client";

// Faithful V2 adaptation of the printed investigator summary in the original
// app/(Dashboard)/(Tahghighat)/Componnet/ErjaMohaghegh.tsx (div_image_page1).
// The original report layout is retained; all values come from the SCOPED
// V2 assignment and its worksheets, not from legacy global case state.
import s from "./InvestigatorSummarySheet.module.css";

export type SummaryIdentity = Partial<Record<
  "ShomarehParvandeh" | "FirstName" | "LastName" | "NameMostar" | "NamePedar" |
  "SalTavalod" | "CodeMelli" | "DinMazhab_NameFarsi" | "Shoghl" |
  "Tahsilat" | "Sokonat" | "Sabeghe" | "NameOstan" | "NameHozeh", string | number | null>>;

export type SummaryWorksheet = {
  WorksheetId?: number | string;
  CodeManba?: number | string;
  TahghighType?: number | string;
  TypeMahalTahghighName?: string;
  TahghighTypeName?: string;
  PeyvastCount?: number | string;
};

const show = (value:unknown) => value === null || value === undefined || String(value).trim() === "" ? "—" : String(value);
const fa = (value:number) => value.toLocaleString("fa-IR");

function Value({children}: {children:unknown}) {
  return <span className={s.value}>{show(children)}</span>;
}
function Field({label,children}: {label:string;children:unknown}) {
  return <span className={s.field}><span>{label} :</span><Value>{children}</Value></span>;
}
function DigitBoxes({value,maxLength}: {value:unknown;maxLength:4|10}) {
  const raw = value == null ? "" : String(value).replace(/[^\d۰-۹٠-٩]/g, "");
  const digits = Array.from(raw).slice(0,maxLength);
  return <span dir="ltr" className={s.digits} aria-label={raw || "ثبت نشده"}>
    {digits.length ? digits.map((digit,i)=><span className={s.digit} key={i}>{digit}</span>):<span className={s.value}>—</span>}
  </span>;
}
function NumberValue({number,blue=false}: {number:number;blue?:boolean}) {
  return <span className={`${s.numberValue} ${blue?s.blueValue:""}`}>{fa(number)}</span>;
}
function Stat({label,number}: {label:string;number:number}) {
  return <span className={s.stat}><span>{label} :</span><NumberValue number={number}/></span>;
}

export function InvestigatorSummarySheet({identity,worksheets,investigatorName,summaryText,onChange,editable=false,variant="INVESTIGATOR",countyName}: {
  identity:SummaryIdentity;
  worksheets:SummaryWorksheet[];
  investigatorName:string;
  assignmentId:number;
  summaryText:string;
  onChange?:(text:string)=>void;
  editable?:boolean;
  variant?:"INVESTIGATOR"|"COUNTY";
  countyName?:string;
}) {
  const countType = (name:string) => worksheets.filter(x => (x.TahghighTypeName||"").includes(name)).length;
  const countPlace = (name:string) => worksheets.filter(x => (x.TypeMahalTahghighName||"").includes(name)).length;
  const sourceCodes = new Set(worksheets.map(x => Number(x.CodeManba)).filter(x => Number.isSafeInteger(x) && x>0 && x!==999999));
  const totalPeyvast = worksheets.reduce((sum,x) => sum + Math.max(0, Number(x.PeyvastCount)||0), 0);
  const ids = worksheets.map(x=>x.WorksheetId).filter(id=>id!==null&&id!==undefined&&id!=="");
  // Official summary completion date: use the current Persian date in Iran,
  // including in the PNG export of the form (not just the editable preview).
  const completionDate = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year:"numeric", month:"2-digit", day:"2-digit", timeZone:"Asia/Tehran"
  }).format(new Date()).replace(/[\u200e\u200f]/g, "");

  return <article dir="rtl" className={`${s.sheet} merat-legacy-print-form`}>
    {/* Original 140px three-part header; official images provided by public/. */}
    <header className={s.header}>
      <div className={s.seal}>
        <img src="/logo/karbargmohaghegh/Mohr1.png" alt="مهر کاربرگ جمع‌بندی محقق"
          className={s.sealImage} data-merat-summary-logo="true" />
      </div>
      <div className={s.headline}>
        {variant==="COUNTY"
          ? <div className={s.countyTitle}>کاربرگ جمع‌بندی تحقیقات<br/><small>ویژه نماینده شهرستان {countyName || ""}</small></div>
          : <img src="/logo/karbargmohaghegh/JambandiMohaghegh.PNG" alt="عنوان رسمی کاربرگ جمع‌بندی محقق"
              className={s.headingImage} data-merat-summary-heading="true" />}
      </div>
      <div className={s.headerInfo}>
        <div>شماره سریال : <span className={s.dottedSerial}>........................</span></div>
        <div>استان : <span>{show(identity.NameOstan)}</span></div>
        <div>حوزه انتخابیه : <span className={s.hoze}>{show(identity.NameHozeh)}</span></div>
        {variant==="COUNTY" && <div>شهرستان : <span className={s.hoze}>{show(countyName)}</span></div>}
      </div>
    </header>

    {/* Same horizontal two-row applicant panel as the OLD printable sheet. */}
    <section className={s.legacyPanel} aria-label="مشخصات داوطلب">
      <div className={s.sideLabel}><span>مشخصات داوطلب</span></div>
      <div className={s.panelBody}>
        <div className={s.fieldRow}>
          <Field label="نام">{identity.FirstName}</Field>
          <Field label="نام خانوادگی">{identity.LastName}</Field>
          <Field label="نام مشهور / مستعار">{identity.NameMostar}</Field>
          <Field label="نام پدر">{identity.NamePedar}</Field>
          <span className={s.field}><span>سال تولد :</span><DigitBoxes value={identity.SalTavalod} maxLength={4}/></span>
        </div>
        <div className={s.fieldRow}>
          <span className={s.field}><span>شماره ملی :</span><DigitBoxes value={identity.CodeMelli} maxLength={10}/></span>
          <Field label="دین - مذهب">{identity.DinMazhab_NameFarsi}</Field>
          <Field label="شغل">{identity.Shoghl}</Field>
          <Field label="تحصیلات">{identity.Tahsilat}</Field>
          <Field label="سابقه داوطلبی">{identity.Sabeghe}</Field>
        </div>
        <div className={s.fieldRow}>
          <Field label="محل سکونت">{identity.Sokonat}</Field>
        </div>
      </div>
    </section>

    {/* Original 130px research panel, including separators and boxed counters. */}
    <section className={s.legacyPanel} aria-label="مشخصات تحقیقات">
      <div className={s.sideLabel}><span>مشخصات تحقیقات</span></div>
      <div className={s.panelBody}>
        <div className={s.fieldRow}>
          <Stat label="تعداد کل منابع تحقیق شده" number={sourceCodes.size}/>
          <Stat label="محل کار" number={countPlace("کار")}/>
          <Stat label="محل تحصیل" number={countPlace("تحصیل")}/>
          <Stat label="محل زندگی" number={countPlace("زندگی")}/>
          <span className={s.stat}><span>تعداد پیوست :</span><NumberValue number={totalPeyvast} blue/><span>صفحه</span></span>
        </div>
        <div className={s.fieldRow}>
          <span className={s.serialLabel}>تعداد کاربرگ ها و شماره سریال آنها :</span>
          <Stat label="تحقیق از داوطلب" number={countType("داوطلب")}/>
          <Stat label="تحقیق کامل ۳ برگی" number={countType("کامل")}/>
        </div>
        <div className={s.fieldRow}>
          <Stat label="گزارش تحقیق محدود" number={countType("محدود")}/>
          <span className={s.dottedLine} aria-hidden="true" />
          <Stat label="بازخوانی پرونده" number={countType("بازخوانی")}/>
          <span className={s.dottedLine} aria-hidden="true" />
        </div>
        {ids.length>0 && <div className={s.worksheetSerials}>سریال کاربرگ‌ها: {ids.map(id=>show(id)).join("، ")}</div>}
      </div>
    </section>

    <section className={s.report}>
      <div className={s.reportTitle}>{variant==="COUNTY"
        ? "جمع‌بندی نهایی شهرستان بر اساس نتایج تحقیقات و مهم‌ترین موارد مندرج در کاربرگ‌ها :"
        : "جمع بندی تحقیقات صورت گرفته براساس مهمترین موارد درج شده در کاربرگ های تحقیق :"}</div>
      {editable ? <textarea className={s.reportEditor} aria-label={variant==="COUNTY"?"متن جمع‌بندی شهرستان":"متن جمع‌بندی محقق"}
        value={summaryText} onChange={e=>onChange?.(e.target.value)} maxLength={12000}
        placeholder="متن جمع‌بندی تحقیقات صورت گرفته را وارد کنید…" />
        : <div className={s.reportText}>{summaryText.trim()||" "}</div>}
    </section>
    <footer className={s.footer}>
      <span>{variant==="COUNTY"?"شهرستان تهیه‌کننده":"محقق"} : <b>{investigatorName||"—"}</b></span>
      <span>تاریخ تکمیل : <b>{completionDate}</b></span>
      <span>{variant==="COUNTY"?"امضاء نماینده شهرستان":"امضاء"} : ..........................</span>
    </footer>
  </article>;
}
