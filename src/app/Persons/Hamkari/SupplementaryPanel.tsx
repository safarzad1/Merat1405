"use client";
import {useCallback,useEffect,useState} from "react";
import {Check,Save,RefreshCcw,ChevronDown} from "lucide-react";
import styles from "./Hamkari.module.css";
type Field = "IsHefazat" | "IsRayane" | "OlaviyatBandi" | "Amalkard" | "IsDoreAmozeshi";
type Data=Record<Field,number|null>&{Tozihat:string; UpdatedAt?:string|null};
const empty:Data={IsHefazat:null,IsRayane:null,OlaviyatBandi:null,Amalkard:null,IsDoreAmozeshi:null,Tozihat:""};
const groups:{key:Field;label:string;options:{value:number;label:string}[]}[]=[
 {key:"IsHefazat",label:"تأیید حفاظت",options:[{value:0,label:"ندارد"},{value:1,label:"دارد"}]},
 {key:"IsRayane",label:"آشنایی با رایانه",options:[{value:0,label:"ندارد"},{value:1,label:"دارد"}]},
 {key:"OlaviyatBandi",label:"اولویت‌بندی",options:[{value:1,label:"شماره یک"},{value:2,label:"شماره دو"},{value:3,label:"شماره سه"}]},
 {key:"Amalkard",label:"ارزیابی عملکرد",options:[{value:1,label:"ضعیف"},{value:2,label:"متوسط"},{value:3,label:"خوب"},{value:4,label:"عالی"}]},
 {key:"IsDoreAmozeshi",label:"دوره آموزشی",options:[{value:0,label:"ندارد"},{value:1,label:"دارد"}]},
];
async function query(body:Record<string,unknown>){const r=await fetch("/Api/Hamkari/PersonSupplementary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const j=await r.json();if(!r.ok||j.status!==200)throw new Error(j.error||"خطا در ارتباط با سرور");return j.data;}
export default function SupplementaryPanel({personId,userId}:{personId:number;userId:number}){
 const [data,setData]=useState<Data>(empty),[busy,setBusy]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [openField,setOpenField]=useState<Field|null>(null);
 const load=useCallback(async()=>{if(!personId)return;setBusy(true);try{const result=await query({action:"get",personId});setData({...empty,...(result||{})});setError("");}catch(e){setError(e instanceof Error?e.message:"خطا در دریافت اطلاعات");}finally{setBusy(false);}},[personId]);
 useEffect(()=>{void load()},[load]);
 const save=async()=>{if(saving)return;setSaving(true);setError("");setNotice("");try{await query({action:"save",personId,userId,values:data});setNotice("اطلاعات تکمیلی ذخیره شد.");await load();}catch(e){setError(e instanceof Error?e.message:"خطا در ثبت اطلاعات");}finally{setSaving(false);}};
 return <section className={styles.supplementPanel} dir="rtl">
  <div className={styles.jobToolbar}><div><strong>اطلاعات تکمیلی</strong><span>جزئیات ارزیابی و اطلاعات تکمیلی پرونده همکار</span></div><button type="button" onClick={()=>void load()} disabled={busy||saving}><RefreshCcw size={16}/> بازیابی اطلاعات</button></div>
  <div className={styles.supplementGrid}>{groups.map(({key,label,options})=>{
   const current=data[key];
   const selected=options.find(o=>o.value===current);
   const display=current===null?"انتخاب کنید":selected?.label??`کد قدیمی ${current} (عنوان نامشخص)`;
   const choices=[{value:null as number|null,label:"انتخاب کنید"},...(current!==null&&!selected?[{value:current,label:display}]:[]),...options];
   const expanded=openField===key;
   return <div key={key} className={styles.supplementField} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpenField(v=>v===key?null:v);}}>
    <label id={`supplement-label-${key}`}>{label}</label>
    <div className={styles.supplementSelectWrap}>
     <button type="button" className={styles.supplementSelectButton} aria-labelledby={`supplement-label-${key}`} aria-label={`${label}: ${display}`} aria-haspopup="listbox" aria-expanded={expanded} disabled={busy||saving} onClick={()=>setOpenField(v=>v===key?null:key)} onKeyDown={e=>{if(e.key==="Escape")setOpenField(null);if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();setOpenField(key);}}}>
      <span>{display}</span><ChevronDown size={16} aria-hidden="true" />
     </button>
     {expanded&&<div className={styles.supplementSelectMenu} role="listbox" aria-labelledby={`supplement-label-${key}`}>
      {choices.map((option,index)=><button type="button" role="option" aria-selected={current===option.value} className={`${styles.supplementSelectOption} ${current===option.value?styles.supplementSelectSelected:""}`} key={`${key}-${index}`} onClick={()=>{setData(prev=>({...prev,[key]:option.value}));setOpenField(null);}}>{option.label}</button>)}
     </div>}
    </div>
   </div>;
  })}</div>
  <label className={styles.supplementNotes}><span>توضیحات تکمیلی</span><textarea rows={5} maxLength={4000} value={data.Tozihat||""} onChange={e=>setData(prev=>({...prev,Tozihat:e.target.value}))} disabled={busy||saving} placeholder="توضیحات مربوط به پرونده را وارد کنید..."/></label>
  {error&&<div className={styles.jobError} role="alert">{error}</div>}{notice&&<div className={styles.jobSuccess} role="status"><Check size={16}/>{notice}</div>}
  <div className={styles.supplementFooter}><button type="button" onClick={()=>void save()} disabled={busy||saving}><Save size={17}/>{saving?"در حال ذخیره...":"ثبت اطلاعات"}</button></div>
 </section>;
}
