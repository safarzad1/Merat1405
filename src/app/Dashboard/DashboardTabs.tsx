"use client";
import { useState } from "react";
import { BarChart3, Newspaper, FlaskConical } from "lucide-react";
import AnalyticsClient from "@/app/AkhbarAnalytics/AnalyticsClient";
import DashboardCharts, {type DashboardData} from "./DashboardCharts";
import styles from "./DashboardTabs.module.css";

export default function DashboardTabs({initialTab,canSeeNews,research,researchError}:{
 initialTab:"news"|"research";canSeeNews:boolean;research:DashboardData|null;researchError:boolean;
}) {
 const [active,setActive]=useState<"news"|"research">(canSeeNews?initialTab:"research");
 return <main className={styles.wrapper} dir="rtl">
   <header className={styles.top}>
     <div className={styles.brand}><BarChart3 size={21}/><div><h1>داشبورد</h1><p>گزارش‌های سازمانی در محدوده مجاز محل خدمت</p></div></div>
     <div className={styles.tabBar} role="tablist" aria-label="بخش‌های داشبورد">
       {canSeeNews && <button role="tab" aria-selected={active==="news"} className={active==="news"?styles.current:""} onClick={()=>setActive("news")} type="button"><Newspaper size={17}/> اخبار</button>}
       <button role="tab" aria-selected={active==="research"} className={active==="research"?styles.current:""} onClick={()=>setActive("research")} type="button"><FlaskConical size={17}/> تحقیقات</button>
     </div>
   </header>
   <section role="tabpanel" className={styles.content}>
     {active==="news"&&canSeeNews ? <AnalyticsClient/> : research ? <DashboardCharts data={research} researchOnly/> :
       <div className={styles.error}>{researchError?"دریافت گزارش تحقیقات در محدوده سازمانی انجام نشد. اتصال و ساختار جداول را بررسی کنید.":"آمار تحقیقات موجود نیست."}</div>}
   </section>
 </main>;
}
