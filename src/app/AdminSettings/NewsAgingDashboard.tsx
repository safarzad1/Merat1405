"use client";

import { useState } from "react";
import styles from "./NewsAgingDashboard.module.css";

type Summary = { TotalOpen:number;Overdue:number;Unmeasurable:number;OlderThanSevenDays:number;
 InboxMismatch:number;OldestMinutes:number|null;OverdueThresholdHours:number;CheckedAtJalali:string };
type Level = {OrgLevel:number;TotalOpen:number;Overdue:number;Unmeasurable:number;OldestMinutes:number|null};
type Owner = {OwnerUserId:number;OwnerName:string;PostName:string;OrgLevel:number;OwnerActive:boolean;
 TotalOpen:number;Overdue:number;Unmeasurable:number;OldestMinutes:number|null;
 Actions30Days:number;Sent30Days:number;Returned30Days:number};
type News = {ShomareKhabar:number;OnvanKhabar:string;CurrentStatusCode:string;OwnerUserId:number;
 OwnerName:string;PostName:string;OrgLevel:number;InboxDateTime:string;AgeMinutes:number|null;
 ActiveInboxCount:number;HasInboxMismatch:boolean;OwnerActive:boolean};
const names=["همه سطوح","ستاد","استان","حوزه","شهرستان"];
const fa=(n:number|null|undefined)=>Number(n??0).toLocaleString("fa-IR");
const age=(minutes:number|null)=>minutes===null?"نامشخص":minutes>=1440
  ?`${fa(Math.floor(minutes/1440))} روز و ${fa(Math.floor((minutes%1440)/60))} ساعت`
  :minutes>=60?`${fa(Math.floor(minutes/60))} ساعت و ${fa(minutes%60)} دقیقه`:`${fa(minutes)} دقیقه`;

export default function NewsAgingDashboard(){
 const [hours,setHours]=useState("48");
 const [level,setLevel]=useState("0");
 const [search,setSearch]=useState("");
 const [onlyOverdue,setOnlyOverdue]=useState(false);
 const [summary,setSummary]=useState<Summary|null>(null);
 const [levels,setLevels]=useState<Level[]>([]);
 const [owners,setOwners]=useState<Owner[]>([]);
 const [news,setNews]=useState<News[]>([]);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [requested,setRequested]=useState(false);
 async function load(){
   if(loading)return;
   const threshold=Number(hours);
   if(!Number.isInteger(threshold)||threshold<1||threshold>720){setError("آستانه تأخیر باید بین ۱ تا ۷۲۰ ساعت باشد.");return;}
   setLoading(true);setError("");setRequested(true);
   try{
     const params=new URLSearchParams({hours:String(threshold),level,search:search.trim(),onlyOverdue:onlyOverdue?"1":"0"});
     const res=await fetch(`/Api/Akhbar/AgingDashboard?${params.toString()}`,{cache:"no-store"});
     const data=await res.json();
     if(!res.ok||!data.summary)throw new Error(data.error||"گزارش دریافت نشد.");
     setSummary(data.summary);setLevels(data.levels||[]);setOwners(data.owners||[]);setNews(data.news||[]);
   }catch(err){setSummary(null);setLevels([]);setOwners([]);setNews([]);
     setError(err instanceof Error?err.message:"خطا در دریافت گزارش");}
   finally{setLoading(false);}
 }
 return <section className={styles.root} dir="rtl" aria-label="پایش مدت توقف اخبار">
   <div className={styles.heading}><div><h2>پایش مدت توقف اخبار</h2>
    <p>مدت حضور در کارتابل فعلی، موارد دیرکرددار و حجم اقدامات ثبت‌شده در ۳۰ روز گذشته. گزارش فقط‌خواندنی است.</p></div></div>
   <form className={styles.filters} onSubmit={e=>{e.preventDefault();void load()}}>
    <label>آستانه تأخیر (ساعت)<input type="number" min="1" max="720" value={hours}
      onChange={e=>setHours(e.target.value)} /></label>
    <label>سطح سازمانی<select value={level} onChange={e=>setLevel(e.target.value)}>
      {names.map((name,index)=><option key={name} value={index}>{name}</option>)}
    </select></label>
    <label className={styles.search}>عنوان، شماره خبر یا مسئول<input value={search} maxLength={120}
      placeholder="جست‌وجو..." onChange={e=>setSearch(e.target.value)} /></label>
    <label className={styles.check}><input type="checkbox" checked={onlyOverdue}
       onChange={e=>setOnlyOverdue(e.target.checked)}/>فقط اخبار دیرکرددار در جدول</label>
    <button disabled={loading} type="submit">{loading?"در حال محاسبه...":"نمایش گزارش"}</button>
   </form>
   {error?<p role="alert" className={styles.error}>{error}</p>:null}
   {summary?<>
    <p className={styles.hint}>زمان بررسی: {summary.CheckedAtJalali} | خلاصه آمار مطابق سطح و جست‌وجوی انتخابی است؛ گزینه «فقط دیرکرددار» صرفاً جدول اخبار را محدود می‌کند.</p>
    <div className={styles.metrics}>
      <div><span>اخبار در گردش</span><strong>{fa(summary.TotalOpen)}</strong></div>
      <div><span>گذشته از آستانه</span><strong className={styles.alertText}>{fa(summary.Overdue)}</strong></div>
      <div><span>بیش از ۷ روز</span><strong>{fa(summary.OlderThanSevenDays)}</strong></div>
      <div><span>زمان نامشخص</span><strong>{fa(summary.Unmeasurable)}</strong></div>
      <div><span>مغایرت کارتابل</span><strong>{fa(summary.InboxMismatch)}</strong></div>
    </div>
    {Number(summary.Unmeasurable)>0?<p className={styles.warning}>زمان ورود برخی اخبار قابل تبدیل نیست؛ این موارد در آمار دیرکرد محاسبه نشده‌اند و باید بررسی شوند.</p>:null}
    {Number(summary.InboxMismatch)>0?<p className={styles.warning}>برخی اخبار مغایرت کارتابل دارند؛ برای تشخیص جزئیات به «کنترل سلامت گردش اخبار» مراجعه کنید.</p>:null}
    <h3 className={styles.subhead}>خلاصه بر اساس سطح سازمانی</h3>
    <div className={styles.levels}>{levels.length?levels.map(l=><div key={l.OrgLevel}>
      <strong>{names[l.OrgLevel]||"سایر"}</strong><span>{fa(l.TotalOpen)} خبر در گردش</span>
      <small>{fa(l.Overdue)} دیرکرد · {fa(l.Unmeasurable)} زمان نامشخص</small>
    </div>):<p className={styles.empty}>موردی پیدا نشد.</p>}</div>
    <h3 className={styles.subhead}>حجم کار مسئولان</h3>
    <p className={styles.hint}>«اقدام ۳۰ روز» تعداد ارسال‌ها و برگشت‌های ثبت‌شده است؛ شاخص کیفیت یا ارزیابی نهایی عملکرد افراد نیست. حداکثر ۱۰۰ مسئول نشان داده می‌شود.</p>
    <div className={styles.tableWrap}><table><thead><tr><th>مسئول</th><th>سطح / پست</th>
      <th>اخبار باز</th><th>دیرکرد</th><th>قدیمی‌ترین</th><th>اقدام ۳۰ روز</th><th>ارسال</th><th>برگشت</th></tr></thead>
      <tbody>{owners.map(o=><tr key={`${o.OwnerUserId}-${o.OrgLevel}`}><td>{o.OwnerName}{!o.OwnerActive?<small className={styles.warning}> (غیرفعال)</small>:null}</td>
       <td>{names[o.OrgLevel]||"سایر"} · {o.PostName}</td><td>{fa(o.TotalOpen)}</td><td>{fa(o.Overdue)}</td>
       <td>{age(o.OldestMinutes)}</td><td>{fa(o.Actions30Days)}</td><td>{fa(o.Sent30Days)}</td><td>{fa(o.Returned30Days)}</td></tr>)}
       {!owners.length?<tr><td colSpan={8} className={styles.empty}>موردی پیدا نشد.</td></tr>:null}</tbody></table></div>
    <h3 className={styles.subhead}>جزئیات اخبار در کارتابل</h3>
    <p className={styles.hint}>حداکثر ۱۰۰ خبر، به‌ترتیب بیشترین تأخیر نمایش داده می‌شود. اعداد از زمان دریافت کارتابل فعلی محاسبه شده‌اند.</p>
    <div className={styles.tableWrap}><table><thead><tr><th>شماره</th><th>عنوان خبر</th><th>مسئول / سطح</th>
      <th>زمان ورود به کارتابل</th><th>مدت توقف</th><th>وضعیت</th></tr></thead>
      <tbody>{news.map(n=><tr key={n.ShomareKhabar}><td>{fa(n.ShomareKhabar)}</td><td>{n.OnvanKhabar||"—"}</td>
        <td>{n.OwnerName} · {names[n.OrgLevel]||"سایر"}</td><td dir="ltr">{n.InboxDateTime||"—"}</td>
        <td>{age(n.AgeMinutes)}</td><td>{n.HasInboxMismatch?"مغایرت کارتابل":n.AgeMinutes===null?"زمان نامشخص":n.AgeMinutes>=summary.OverdueThresholdHours*60?"دیرکرد":"عادی"}</td></tr>)}
        {!news.length?<tr><td colSpan={6} className={styles.empty}>موردی در فهرست مطابق فیلترها وجود ندارد.</td></tr>:null}</tbody></table></div>
   </>:requested&&!loading&&!error?<p className={styles.empty}>گزارشی دریافت نشد.</p>:null}
 </section>
}
