"use client";
import { useState } from "react";
import styles from "./DashboardCharts.module.css";

export type SeriesItem = { label: string; value: number };
export type DashboardData = {
  news: { daily: SeriesItem[]; monthly: SeriesItem[]; provinces: SeriesItem[] };
  research: { daily: SeriesItem[]; monthly: SeriesItem[]; provinces: SeriesItem[] };
  totals: { news: number; referrals: number; assigned: number; done: number };
};
type Mode = "daily" | "monthly" | "provinces";
const fmt = new Intl.NumberFormat("fa-IR");

function Bars({ items, hue }: { items: SeriesItem[]; hue: string }) {
  if (!items.length) return <p className={styles.empty}>داده‌ای برای نمایش موجود نیست.</p>;
  const max = Math.max(1, ...items.map(x => x.value));
  return <div className={styles.bars}>{items.map((x, i) => <div className={styles.barRow} key={x.label + i}>
    <span className={styles.barName} title={x.label}>{x.label}</span>
    <div className={styles.track}><div className={styles.fill} style={{width: `${Math.max(x.value ? 2 : 0, x.value/max*100)}%`, background: hue}} /></div>
    <span className={styles.barValue}>{fmt.format(x.value)}</span>
  </div>)}</div>;
}

function Card({ title, description, data, mode, hue }: {title:string;description:string;data:DashboardData["news"];mode:Mode;hue:string}) {
  return <section className={styles.chartCard}><div className={styles.cardHead}><div><h2>{title}</h2><p>{description}</p></div><span className={styles.count}>{fmt.format(data[mode].reduce((s,x) => s + x.value,0))}</span></div>
    <Bars items={data[mode]} hue={hue}/>
    <p className={styles.footnote}>{mode === "provinces" ? "۱۵ محدوده نخست بر اساس محل فرستنده ارجاع" : mode === "monthly" ? "۱۸ ماه دارای رکورد اخیر؛ تاریخ شمسی" : "۱۸ روز دارای رکورد اخیر؛ تاریخ شمسی"}</p>
  </section>;
}

export default function DashboardCharts({data,researchOnly=false}:{data:DashboardData;researchOnly?:boolean}) {
  const [mode,setMode] = useState<Mode>("monthly");
  const metrics = researchOnly ? [
    ["ارجاعات در محدوده",data.totals.referrals], ["تحقیقات واگذارشده",data.totals.assigned],
    ["تحقیقات تکمیل‌شده",data.totals.done]
  ] as const : [
    ["کل اخبار",data.totals.news], ["ارجاعات تحقیقات",data.totals.referrals],
    ["تحقیقات واگذارشده",data.totals.assigned], ["تحقیقات تکمیل‌شده",data.totals.done]
  ] as const;
  return <section className={styles.main} dir="rtl">
    <div className={styles.heading}><div><h1>{researchOnly ? "آمار تحقیقات" : "داشبورد آماری"}</h1><p>آمار محدود به محل خدمت و زیرمجموعه مجاز کاربر</p></div><div className={styles.tabs} role="group" aria-label="بازه آماری">
      {([ ["daily","روزانه"],["monthly","ماهانه"],["provinces","محل ارسال"] ] as const).map(([key,label]) => <button key={key} className={mode===key ? styles.active : ""} onClick={()=>setMode(key)} type="button">{label}</button>)}
    </div></div>
    <div className={styles.metrics}>{metrics.map(([name,value]) => <div className={styles.metric} key={name}><span>{name}</span><strong>{fmt.format(value)}</strong></div>)}</div>
    <div className={styles.charts}>
      {!researchOnly && <Card title="آمار اخبار" description="تعداد خبرهای ثبت‌شده" data={data.news} mode={mode} hue="linear-gradient(90deg,#2278cf,#48b4e8)" />}
      <Card title="آمار تحقیقات" description="تعداد ارجاعات تحقیقاتی غیرحذف‌شده" data={data.research} mode={mode} hue="linear-gradient(90deg,#6654c9,#a08bf2)" />
    </div>
    <p className={styles.note}>آمار تحقیقات بر اساس محل فرستنده ارجاع در محدوده سازمانی مجاز استخراج شده است. اعداد، تعداد رکورد هستند و نه اشخاص یکتا.</p>
  </section>;
}
