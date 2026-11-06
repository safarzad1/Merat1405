"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Dropdown } from "@/component/Dropdown";
import styles from "./Hamkari.module.css";

type Account = { BankAccountId:number;NameBank:number;NameBankName?:string;ShomarehHesab:string;ShomarehKart:string;ShomarehSheba:string;IsActive:boolean };
type Fee = { NewsFeeId:number;ShomareKhabar:number;OnvanKhabar:string;Emteyaz:number|null;Mablagh:number;TarikhSabt:string };
const blank:Account={BankAccountId:0,NameBank:0,ShomarehHesab:"",ShomarehKart:"",ShomarehSheba:"",IsActive:true};
async function post(url:string,body:object){
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok||result.status!==200)throw new Error(result.error||"خطا در ارتباط با سرور");
  return result.data;
}

export default function FinancialHistoryPanel({personId,userId}:{personId:number;userId:number}){
  const [accounts,setAccounts]=useState<Account[]>([]);
  const [fees,setFees]=useState<Fee[]>([]);
  const [banks,setBanks]=useState<{value:number;label:string}[]>([]);
  const [draft,setDraft]=useState<Account|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const [showSensitive,setShowSensitive]=useState(false);
  const [feeQuery,setFeeQuery]=useState("");
  const filteredFees=fees.filter(f=>`${f.ShomareKhabar} ${f.OnvanKhabar||""}`.toLocaleLowerCase("fa-IR").includes(feeQuery.trim().toLocaleLowerCase("fa-IR")));
  const totalFees=fees.reduce((sum,f)=>sum+Number(f.Mablagh||0),0);
  const refresh=useCallback(async()=>{
    if(!personId)return;
    setBusy(true);
    try{const result=await post("/Api/Hamkari/PersonFinance",{action:"list",personId});setAccounts(result.accounts||[]);setFees(result.fees||[]);setError("");}
    catch(e){setError(e instanceof Error?e.message:"دریافت اطلاعات مالی ناموفق بود.");}
    finally{setBusy(false);}
  },[personId]);
  useEffect(()=>{void refresh();},[refresh]);
  useEffect(()=>{
    let active=true;
    post("/Api/DFN/GetDFnByPID",{pid:13001}).then(data=>{
      if(active)setBanks((Array.isArray(data)?data:[]).map((r:{Value:number;NameFarsi:string})=>({value:Number(r.Value),label:String(r.NameFarsi)})));
    }).catch(()=>{if(active)setError("فهرست بانک‌ها دریافت نشد.");});
    return()=>{active=false;};
  },[]);
  const update=(key:keyof Account,value:string|number|boolean)=>setDraft(old=>old?{...old,[key]:value}:old);
  const digits=(s:string)=>s.replace(/[۰-۹]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g,c=>String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  const save=async()=>{
    if(!draft||busy)return;
    const card=digits(draft.ShomarehKart).replace(/[\s-]/g,"");
    const sheba=digits(draft.ShomarehSheba).replace(/[\s-]/g,"").toUpperCase();
    if(!draft.ShomarehHesab.trim()&&!card&&!sheba){setError("شماره حساب، کارت یا شبا را وارد کنید.");return;}
    if(card&&!/^\d{16}$/.test(card)){setError("شماره کارت باید ۱۶ رقم باشد.");return;}
    if(sheba&&!/^IR\d{24}$/.test(sheba)){setError("شماره شبا باید با IR شروع شده و ۲۴ رقم داشته باشد.");return;}
    setBusy(true);setError("");
    try{
      await post("/Api/Hamkari/PersonFinance",{action:"save",personId,userId,bankAccountId:draft.BankAccountId,account:{...draft,ShomarehKart:card,ShomarehSheba:sheba}});
      setDraft(null);setNotice("اطلاعات حساب ذخیره شد.");await refresh();
    }catch(e){setError(e instanceof Error?e.message:"ذخیره حساب ناموفق بود.");}finally{setBusy(false);}
  };
  const remove=async(account:Account)=>{
    if(!await meratConfirm(`حساب بانک «${account.NameBankName||"بدون عنوان"}» حذف شود؟`))return;
    try{await post("/Api/Hamkari/PersonFinance",{action:"delete",personId,userId,bankAccountId:account.BankAccountId});setNotice("حساب حذف شد.");await refresh();}
    catch(e){setError(e instanceof Error?e.message:"حذف حساب ناموفق بود.");}
  };
  const masked=(value:string|undefined,keep=4)=>{
    const v=String(value||"");return !v?"—":showSensitive?v:`•••• ${v.slice(-keep)}`;
  };
  return <section className={styles.jobPanel} dir="rtl">
    <div className={styles.jobToolbar}><div><strong>اطلاعات حساب‌های بانکی</strong><span>{accounts.length.toLocaleString("fa-IR")} حساب</span></div><div><button type="button" onClick={()=>setShowSensitive(v=>!v)} style={{background:"#f7fafc",color:"#224d68",borderColor:"#bacdd9"}}>{showSensitive?"پنهان کردن شماره‌ها":"نمایش شماره‌ها"}</button><button type="button" onClick={()=>{setDraft({...blank});setError("");}}><Plus size={16}/> افزودن حساب</button></div></div>
    {notice&&<p className={styles.jobSuccess} role="status">{notice}</p>}{!draft&&error&&<p className={styles.jobError} role="alert">{error}</p>}
    <div className={styles.jobTableScroll}><table className={styles.jobTable}><thead><tr><th>بانک</th><th>وضعیت حساب</th><th>شماره حساب</th><th>شماره کارت</th><th>شماره شبا</th><th>عملیات</th></tr></thead><tbody>
      {accounts.map(a=><tr key={a.BankAccountId}><td className={styles.jobName}>{a.NameBankName||"—"}</td><td><span className={styles.jobStatus}>{a.IsActive?"فعال":"غیرفعال"}</span></td><td dir="ltr">{masked(a.ShomarehHesab)}</td><td dir="ltr">{masked(a.ShomarehKart)}</td><td dir="ltr">{masked(a.ShomarehSheba)}</td><td><div className={styles.jobActions}><button type="button" title="ویرایش" aria-label="ویرایش حساب" onClick={()=>{setDraft({...a});setError("");}}><Pencil size={16}/></button><button type="button" title="حذف" aria-label="حذف حساب" onClick={()=>void remove(a)}><Trash2 size={16}/></button></div></td></tr>)}
      {accounts.length===0&&<tr><td colSpan={6} className={styles.jobEmpty}>{busy?"در حال بارگذاری...":"حساب بانکی برای این فرد ثبت نشده است."}</td></tr>}
    </tbody></table></div>
    <div className={styles.jobToolbar} style={{marginTop:18}}><div><strong>اخبار مشمول حق‌الزحمه</strong><span>{fees.length.toLocaleString("fa-IR")} خبر ثبت‌شده · جمع مبالغ: {totalFees.toLocaleString("fa-IR")} ریال</span></div><div><input className={styles.financeSearch} aria-label="جستجوی اخبار حق‌الزحمه" placeholder="جستجو بر اساس شماره یا عنوان خبر..." value={feeQuery} onChange={e=>setFeeQuery(e.target.value)} /></div></div>
    <div className={styles.jobTableScroll}><table className={styles.jobTable}><thead><tr><th>شماره خبر</th><th>عنوان خبر</th><th>امتیاز خبر</th><th>مبلغ حق‌الزحمه</th><th>تاریخ ثبت</th></tr></thead><tbody>
      {filteredFees.map(f=><tr key={f.NewsFeeId}><td>{f.ShomareKhabar.toLocaleString("fa-IR")}</td><td className={styles.jobName}>{f.OnvanKhabar}</td><td>{f.Emteyaz==null?"—":f.Emteyaz.toLocaleString("fa-IR")}</td><td>{f.Mablagh.toLocaleString("fa-IR")}</td><td>{f.TarikhSabt||"—"}</td></tr>)}
      {filteredFees.length===0&&<tr><td colSpan={5} className={styles.jobEmpty}>{busy?"در حال بارگذاری...":feeQuery?"خبری با این عبارت پیدا نشد.":"موردی در سوابق حق‌الزحمه اخبار ثبت نشده است."}</td></tr>}
    </tbody></table></div>
    {draft&&<div className={styles.jobOverlay} onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setDraft(null);}}><div className={styles.jobDialog} role="dialog" aria-modal="true" aria-label="فرم حساب بانکی">
      <div className={`${styles.jobDialogHeader} merat-modal-tone--neutral`}><strong>{draft.BankAccountId?"ویرایش حساب بانکی":"افزودن حساب بانکی"}</strong><button type="button" aria-label="بستن" onClick={()=>setDraft(null)}><X size={20}/></button></div>
      <div className={styles.jobForm}>
        <label className={styles.jobField}><span>نام بانک</span><Dropdown<number> value={draft.NameBank||null} options={banks} onChange={v=>update("NameBank",Number(v)||0)} placeholder="انتخاب بانک" /></label>
        <label className={styles.jobField}><span>وضعیت حساب</span><Dropdown<number> value={draft.IsActive?1:2} options={[{value:1,label:"فعال"},{value:2,label:"غیرفعال"}]} onChange={v=>update("IsActive",Number(v)===1)} placeholder="وضعیت" /></label>
        {([ ["شماره حساب","ShomarehHesab",150],["شماره کارت","ShomarehKart",16],["شماره شبا (IR)","ShomarehSheba",26] ] as const).map(([label,key,max])=><label className={styles.jobField} key={key}><span>{label}</span><input dir="ltr" maxLength={max} value={draft[key]||""} onChange={e=>update(key,e.target.value)} /></label>)}
      </div>{error&&<p className={styles.jobError} role="alert">{error}</p>}
      <div className={styles.jobFooter}><button type="button" disabled={busy} onClick={()=>setDraft(null)}>انصراف</button><button type="button" disabled={busy} onClick={()=>void save()}>{busy?"در حال ذخیره...":"ذخیره حساب"}</button></div>
    </div></div>}
  </section>;
}
