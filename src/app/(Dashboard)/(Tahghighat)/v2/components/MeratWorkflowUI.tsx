"use client";
import type { ReactNode } from "react";
import styles from "./MeratWorkflowUI.module.css";

export { styles as workflowStyles };
const labels: Record<string,string> = {
 PENDING: "در انتظار شروع", IN_PROGRESS: "در حال تحقیق", DONE: "تکمیل‌شده", CANCELLED: "لغوشده",
 CHILD_INBOX: "دریافت‌شده", CHILD_WORKING: "در حال بررسی", PENDING_CHILD_RESULTS: "در انتظار پاسخ",
 PROVINCE_INBOX: "در انتظار اقدام استان", PROVINCE_WORKING: "در حال بررسی استان",
 PROVINCE_RETURNED: "برگشتی", DIRECTOR_REVIEW: "بررسی رئیس دفتر", SETAD_REVIEW: "بررسی ستاد",
 APPROVED: "تأییدشده"
};
export function StateChip({ value }: { value: unknown }) {
 const code = String(value ?? "");
 const variant = code === "DONE" || code === "APPROVED" ? styles.chipSuccess :
  code === "CANCELLED" || code.includes("RETURNED") ? styles.chipDanger :
  code === "PENDING" || code.includes("INBOX") || code === "PENDING_CHILD_RESULTS" ? styles.chipWarning : styles.chipInfo;
 return <span className={`${styles.chip} ${variant}`}>{labels[code] ?? (code || "نامشخص")}</span>;
}
export function WorkflowHero({ eyebrow, title, description, stats, children }: {
 eyebrow: string; title: string; description: string;
 stats?: { label: string; value: number|string; hint?: string }[];
 children?: ReactNode;
}) { return <header className={styles.hero}>
 <div className={styles.heroHeader}><div><div className={styles.eyebrow}><span className={styles.heroDot}/>{eyebrow}</div>
 <h1>{title}</h1><p>{description}</p></div><div className={styles.heroActions}>{children}</div></div>
 {stats && stats.length > 0 && <div className={styles.metrics}>{stats.map((s,i)=><div className={styles.metric} key={`${s.label}-${i}`}>
 <span>{s.label}</span><strong>{s.value}</strong>{s.hint && <small>{s.hint}</small>}</div>)}</div>}
 </header>;
}
export function EmptyMessage({ title = "موردی برای نمایش وجود ندارد", description = "پس از ثبت اطلاعات، نتیجه در این بخش نمایش داده می‌شود." }: { title?:string; description?:string }) {
 return <div className={styles.empty}><span aria-hidden="true" className={styles.emptyIcon}>▤</span><strong>{title}</strong><p>{description}</p></div>;
}
export function AppNotice({ kind, children }: { kind:"error"|"success"|"info"; children:ReactNode }) {
 return <div role={kind === "error" ? "alert" : "status"} className={`${styles.notice} ${kind === "error" ? styles.noticeError : kind === "success" ? styles.noticeSuccess : styles.noticeInfo}`}>
 <span aria-hidden="true">{kind === "error" ? "!" : kind === "success" ? "✓" : "i"}</span><div>{children}</div></div>;
}
export function SectionTitle({ kicker, title, description }: { kicker?:string; title:string; description?:string }) {
 return <div className={styles.sectionTitle}>{kicker && <span>{kicker}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>;
}
