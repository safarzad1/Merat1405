"use client";
import { useCallback, useEffect, useState } from "react";
import styles from "./NewsOverdueManagement.module.css";

type Threshold={OrgLevel:number;HoursLimit:number};
type Summary={AllAlerts:number;OpenAlerts:number;ResolvedAlerts:number};
type Alert={AlertId:number;ShomareKhabar:number;OnvanKhabar:string;OrgLevel:number;OwnerUserId:number|null;
 ThresholdHours:number;InboxDateTime:string;FirstDetectedAtUtc:string;ResolvedAtUtc:string|null;
 OwnerName:string;RecipientCount:number;AcknowledgedCount:number};
type Event={EventId:number;AlertId:number;ShomareKhabar:number;ActorName:string;ActionCode:string;Details:string;CreatedAtUtc:string};
const levels=["","ستاد","استان","حوزه","شهرستان"];
const fa=(n:number)=>Number(n||0).toLocaleString("fa-IR");
export default function NewsOverdueManagement(){
 const [thresholds,setThresholds]=useState<Threshold[]>([]);
 const [values,setValues]=useState<Record<number,string>>({});
 const [summary,setSummary]=useState<Summary|null>(null);
 const [alerts,setAlerts]=useState<Alert[]>([]);
 const [events,setEvents]=useState<Event[]>([]);
 const [loading,setLoading]=useState(false);
 const [saving,setSaving]=useState<number|null>(null);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  try{
   const r=await fetch("/Api/Akhbar/OverdueManagement",{cache:"no-store"});
   const data=await r.json();if(!r.ok)throw new Error(data.error||"گزارش هشدارها دریافت نشد.");
   setThresholds(data.thresholds||[]);setValues(Object.fromEntries((data.thresholds||[]).map((t:Threshold)=>[t.OrgLevel,String(t.HoursLimit)])));
   setSummary(data.summary);setAlerts(data.alerts||[]);setEvents(data.events||[]);
  }catch(e){setError(e instanceof Error?e.message:"خطا در دریافت هشدارها");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function save(level:number){
  const hours=Number(values[level]);
  if(!Number.isInteger(hours)||hours<1||hours>720){setError("حد مجاز ۱ تا ۷۲۰ ساعت است.");return;}
  setSaving(level);setError("");setMessage("");
  try{
   const r=await fetch("/Api/Akhbar/OverdueManagement",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({level,hours})});
   const data=await r.json();if(!r.ok)throw new Error(data.error||"ذخیره انجام نشد.");
   setMessage(`آستانه ${levels[level]} روی ${fa(hours)} ساعت ذخیره شد.`);
   await load();
  }catch(e){setError(e instanceof Error?e.message:"خطا در ذخیره آستانه");}
  finally{setSaving(null);}
 }
 return <section className={styles.root} dir="rtl" aria-label="هشدارهای دیرکرد اخبار">
  <header className={styles.heading}><div><h2>هشدار دیرکرد و پیگیری اخبار</h2>
   <p>تنظیم زمان رسیدگی برای هر سطح و مشاهده سابقه اعلان‌ها؛ هیچ خبری از این بخش تغییر داده نمی‌شود.</p></div>
   <button type="button" onClick={()=>void load()} disabled={loading}>{loading?"در حال بررسی...":"بررسی و به‌روزرسانی"}</button></header>
  <div className={styles.thresholds}>{thresholds.map(t=><div key={t.OrgLevel} className={styles.threshold}>
    <label htmlFor={`news-overdue-${t.OrgLevel}`}>{levels[t.OrgLevel]} (ساعت)</label>
    <div><input id={`news-overdue-${t.OrgLevel}`} type="number" min={1} max={720} value={values[t.OrgLevel]??String(t.HoursLimit)}
      onChange={e=>setValues(v=>({...v,[t.OrgLevel]:e.target.value}))}/>
    <button type="button" disabled={saving!==null||loading||Number(values[t.OrgLevel])===t.HoursLimit}
      onClick={()=>void save(t.OrgLevel)}>{saving===t.OrgLevel?"ذخیره...":"ذخیره"}</button></div>
   </div>)}</div>
  {error?<p role="alert" className={styles.error}>{error}</p>:null}
  {message?<p className={styles.success}>{message}</p>:null}
  {summary?<div className={styles.metrics}>
    <div><span>کل هشدارهای ثبت‌شده</span><strong>{fa(summary.AllAlerts)}</strong></div>
    <div><span>هشدارهای باز</span><strong>{fa(summary.OpenAlerts)}</strong></div>
    <div><span>بسته‌شده پس از اقدام</span><strong>{fa(summary.ResolvedAlerts)}</strong></div>
   </div>:null}
  <details className={styles.details}><summary>فهرست هشدارها (حداکثر ۱۰۰ مورد)</summary>
   <div className={styles.tableWrap}><table><thead><tr><th>خبر</th><th>مسئول</th><th>سطح</th><th>حد (ساعت)</th><th>گیرندگان / تأییدها</th><th>وضعیت</th></tr></thead>
   <tbody>{alerts.map(a=><tr key={a.AlertId}><td>{fa(a.ShomareKhabar)} — {a.OnvanKhabar||"—"}</td><td>{a.OwnerName || (a.OwnerUserId ? fa(a.OwnerUserId) : "—")}</td>
    <td>{levels[a.OrgLevel]}</td><td>{fa(a.ThresholdHours)}</td><td>{fa(a.RecipientCount)} / {fa(a.AcknowledgedCount)}</td>
    <td>{a.ResolvedAtUtc?"بسته‌شده":"باز"}</td></tr>)}
    {!alerts.length?<tr><td colSpan={6}>هشداری ثبت نشده است.</td></tr>:null}</tbody></table></div></details>
  <details className={styles.details}><summary>تاریخچه ثبت، مشاهده، تأیید و بسته‌شدن (۱۰۰ اقدام اخیر)</summary>
   <div className={styles.tableWrap}><table><thead><tr><th>خبر / اعلان</th><th>اقدام</th><th>انجام‌دهنده</th><th>زمان UTC</th></tr></thead>
   <tbody>{events.map(e=><tr key={e.EventId}><td>{fa(e.ShomareKhabar)} / {fa(e.AlertId)}</td><td>{e.ActionCode} {e.Details||""}</td><td>{e.ActorName||"سیستم"}</td><td dir="ltr">{e.CreatedAtUtc?.replace("T"," ").slice(0,19)||"—"}</td></tr>)}
    {!events.length?<tr><td colSpan={4}>تاریخچه‌ای ثبت نشده است.</td></tr>:null}</tbody></table></div></details>
  <p className={styles.note}>هشدارها هنگام ورود به اخبار یا بازخوانی گزارش به‌روز می‌شوند. صرف دیدن یا تأیید اعلان، تأخیر را رفع نمی‌کند؛ تغییر واقعی کارتابل لازم است. تغییر آستانه، هشدار موجود را حذف نمی‌کند.</p>
 </section>;
}
