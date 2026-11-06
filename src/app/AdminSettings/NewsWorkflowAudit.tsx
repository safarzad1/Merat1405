"use client";

import { useState } from "react";
import styles from "./NewsWorkflowAudit.module.css";

type Summary = {
  TotalNews: number; AffectedNews: number; TotalIssues: number;
  InboxCountIssues: number; OwnerMismatchIssues: number;
};
type Coverage = { OrganizationalLevel: number; LevelName: string; ActiveUsers: number; ActiveLocations: number };
type Issue = {
  ShomareKhabar: number; OnvanKhabar: string; CurrentStatusCode: string;
  CurrentUserId: number | null; StatusDateTime: string | null;
  ActiveCount: number; LastAction: string | null;
  IssueCode: string; IssueDescription: string;
};

export default function NewsWorkflowAudit() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [coverage, setCoverage] = useState<Coverage[]>([]);
  const [error, setError] = useState("");
  async function audit() {
    if (loading) return;
    setLoading(true); setError("");
    try {
      const response = await fetch("/Api/Akhbar/WorkflowAudit", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.summary) throw new Error(data.error || "نتیجه بررسی دریافت نشد.");
      setSummary(data.summary); setIssues(data.issues || []); setCoverage(data.coverage || []);
    } catch (e) {
      setSummary(null); setIssues([]); setCoverage([]);
      setError(e instanceof Error ? e.message : "خطا در بررسی گردش اخبار");
    } finally { setLoading(false); }
  }
  const toFa = (n: number | null | undefined) => Number(n || 0).toLocaleString("fa-IR");
  return <section className={styles.root} dir="rtl" aria-label="بررسی سلامت گردش اخبار">
    <div className={styles.header}>
      <div><h2>کنترل سلامت گردش اخبار</h2>
        <p>گزارش فقط‌خواندنی برای مدیر سامانه؛ هیچ خبر یا کارتابلی به‌صورت خودکار تغییر نمی‌کند.</p></div>
      <button type="button" disabled={loading} onClick={() => void audit()}>
        {loading ? "در حال بررسی..." : "اجرای بررسی سلامت"}</button>
    </div>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {summary ? <>
      <div className={styles.metrics}>
        <div><span>کل اخبار</span><strong>{toFa(summary.TotalNews)}</strong></div>
        <div><span>اخبار نیازمند بررسی</span><strong>{toFa(summary.AffectedNews)}</strong></div>
        <div><span>موارد مغایرت</span><strong>{toFa(summary.TotalIssues)}</strong></div>
      </div>
      <div className={styles.coverage} aria-label="پوشش کاربران فعال در مراحل گردش">
        {coverage.map((level) => <div key={level.OrganizationalLevel}>
          <span>{level.LevelName}</span>
          <strong>{toFa(level.ActiveUsers)} کاربر فعال</strong>
          <small>{toFa(level.ActiveLocations)} محل خدمت</small>
        </div>)}
      </div>
      {Number(summary.TotalIssues) === 0 ? <p className={styles.success} role="status">
        در کنترل‌های تعریف‌شده مغایرتی یافت نشد؛ این نتیجه جایگزین تست عملی کاربران نیست.</p> :
        <p className={styles.info}>حداکثر ۱۰۰ مورد آخر نمایش داده می‌شود. گزارش صرفاً برای بررسی و رفع دستی ناسازگاری‌ها است.</p>}
      {issues.length ? <div className={styles.tableWrap}><table>
        <thead><tr><th>شماره خبر</th><th>عنوان</th><th>وضعیت</th><th>نوع مغایرت</th><th>مسئول جاری</th></tr></thead>
        <tbody>{issues.map((r, i) => <tr key={`${r.ShomareKhabar}-${r.IssueCode}-${i}`}>
          <td>{toFa(r.ShomareKhabar)}</td><td>{r.OnvanKhabar || "—"}</td>
          <td><code>{r.CurrentStatusCode || "—"}</code></td>
          <td title={r.IssueCode}>{r.IssueDescription}</td>
          <td>{r.CurrentUserId ? toFa(r.CurrentUserId) : "—"}</td>
        </tr>)}</tbody></table></div> : null}
    </> : null}
  </section>;
}
