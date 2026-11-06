import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import sql from "mssql";
import PanelPage from "@/component/PanelPage";
import { getAuthActor } from "@/lib/userScope";
import { getConnection } from "@/lib/db";
import styles from "./TaskManagement.module.css";
import ProjectManager from "./ProjectManager";
import ExecutionPanel from "./ExecutionPanel";

export const dynamic = "force-dynamic";

type Summary = {
  IsSetad: boolean | number;
  ScopeName: string;
  ProjectCount: number;
  TaskCount: number;
  TargetCount: number;
  ReportCount: number;
};
type Project = {
  ProjectId: number;
  Title: string;
  StatusCode: string;
  StartDatePersian: string | null;
  EndDatePersian: string | null;
  TaskCount: number;
};
type Target = {
  TargetId: number;
  ProjectTitle: string;
  TaskTitle: string;
  PersianYear: number;
  Quarter: number;
  TargetValue: number;
  ProvinceName: string;
  AssigneeCount: number;
  ApprovedValue: number;
};
type Assignment = {
  AssignmentId: number;
  TargetId: number;
  UserId: number;
  AssigneeName: string;
  ReportCount: number;
  ApprovedValue: number;
};

const digits = (value: number) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Number(value) || 0);
const yearDigits = (value: number | string) => String(value).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const seasons = ["", "بهار", "تابستان", "پاییز", "زمستان"];
const statusName = (value: string) => value === "ACTIVE" ? "فعال" : value === "CLOSED" ? "پایان‌یافته" : "پیش‌نویس";

function Notice({ denied = false }: { denied?: boolean }) {
  return <div className={styles.notice} role="status">
    {denied ? "دسترسی به این بخش مجاز نیست." : "اطلاعات این بخش در دسترس نیست؛ نصب SQL فاز اول را بررسی کنید."}
  </div>;
}

export default async function TaskManagementPage() {
  const token = (await cookies()).get("token")?.value;
  if (!token) redirect("/Login");
  let userId: number;
  try { userId = (await getAuthActor(token)).userId; }
  catch { redirect("/Login"); }

  let summary: Summary | undefined;
  let projects: Project[] = [];
  let targets: Target[] = [];
  let assignments: Assignment[] = [];
  let error: "denied" | "notReady" | null = null;
  try {
    const pool = await getConnection();
    const result = await pool.request()
      .input("UserId", sql.BigInt, userId)
      .execute("TaskManagementV2.SP_GetOverview");
    summary = result.recordsets?.[0]?.[0] as Summary | undefined;
    projects = (result.recordsets?.[1] ?? []) as Project[];
    targets = (result.recordsets?.[2] ?? []) as Target[];
    assignments = (result.recordsets?.[3] ?? []) as Assignment[];
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    error = /57003|دسترسی مجاز نیست|دسترسی به مدیریت/.test(raw) ? "denied" : "notReady";
    console.error("TaskManagementV2 overview unavailable", err);
  }

  const isSetad = Boolean(summary?.IsSetad);
  const assigneesByTarget = new Map<number, Assignment[]>();
  for (const item of assignments) {
    const targetId = Number(item.TargetId);
    const current = assigneesByTarget.get(targetId) ?? [];
    current.push(item);
    assigneesByTarget.set(targetId, current);
  }

  return <PanelPage title="برنامه‌ها و وظایف">
    <main className={styles.workspace} dir="rtl">
      <header className={styles.header}>
        <h1>برنامه‌ها و وظایف</h1>
        <span className={styles.scope}>{summary?.ScopeName ?? "محدوده مجاز"}</span>
      </header>

      {error ? <Notice denied={error === "denied"} /> : <>
        <section className={styles.metrics} aria-label="آمار برنامه‌ها">
          {[
            ["پروژه‌ها", summary?.ProjectCount, "project"],
            ["وظایف", summary?.TaskCount, "task"],
            ["اهداف فصلی", summary?.TargetCount, "target"],
            ["گزارش‌های عملکرد", summary?.ReportCount, "report"]
          ].map(([label, count, kind]) => <div key={String(label)} className={`${styles.metric} ${styles[String(kind)]}`}>
            <span className={styles.metricLabel}>{label}</span>
            <span className={styles.metricValue}>{digits(Number(count ?? 0))}</span>
          </div>)}
        </section>

        <ExecutionPanel targets={targets} isSetad={isSetad} />

        {isSetad ? <ProjectManager projects={projects} /> : <section className={styles.section} aria-label="نمای پروژه‌ها">
          <div className={styles.sectionHeading}>
            <h2>{isSetad ? "پروژه‌های ستاد" : "پروژه‌های استان"}</h2>
            <span className={styles.sectionCounter}>{digits(projects.length)} پروژه</span>
          </div>
          {projects.length ? <div className={styles.scroll}>
            <table><thead><tr><th>عنوان پروژه</th><th>وضعیت</th><th>شروع</th><th>پایان</th><th>وظایف</th></tr></thead>
              <tbody>{projects.map(p => <tr key={p.ProjectId}>
                <td className={styles.important}>{p.Title}</td>
                <td><span className={`${styles.status} ${p.StatusCode === "ACTIVE" ? styles.active : ""}`}>{statusName(p.StatusCode)}</span></td>
                <td>{p.StartDatePersian ? yearDigits(p.StartDatePersian) : "—"}</td>
                <td>{p.EndDatePersian ? yearDigits(p.EndDatePersian) : "—"}</td>
                <td>{digits(p.TaskCount)}</td>
              </tr>)}</tbody>
            </table>
          </div> : <p className={styles.empty}>پروژه‌ای در محدوده شما ثبت نشده است.</p>}
        </section>}

        {targets.length > 0 && <section className={styles.section} aria-label="مسیر واگذاری وظایف">
          <div className={styles.sectionHeading}>
            <h2>مسیر واگذاری وظایف</h2>
            <span className={styles.sectionCounter}>{digits(targets.length)} هدف فصلی</span>
          </div>
          {targets.length ? <div className={styles.routes}>
            {targets.map(t => {
              const assignees = assigneesByTarget.get(Number(t.TargetId)) ?? [];
              return <details className={styles.route} key={t.TargetId}>
                <summary className={styles.routeSummary}>
                  <span className={styles.chevron} aria-hidden="true">⌄</span>
                  <span className={styles.routeMain}>
                    <span className={styles.routeTitle}>{t.TaskTitle}</span>
                    <span className={styles.routeSub}>{t.ProjectTitle}</span>
                  </span>
                  <span className={styles.routeProvince}>{t.ProvinceName || "استان نامشخص"}</span>
                  <span className={styles.routePeriod}>{seasons[t.Quarter] ?? "—"} {yearDigits(t.PersianYear)}</span>
                  <span className={styles.routeNumber}>{digits(t.ApprovedValue)} <span>از {digits(t.TargetValue)}</span></span>
                  <span className={styles.routeTag}>{digits(t.AssigneeCount)} مسئول</span>
                </summary>
                <div className={styles.routeBody}>
                  <div className={styles.flowPath} aria-label="مراحل واگذاری">
                    <div className={styles.flowStep}><span className={styles.stepLabel}>پروژه</span><span className={styles.stepValue}>{t.ProjectTitle}</span></div>
                    <span className={styles.flowArrow} aria-hidden="true">←</span>
                    <div className={styles.flowStep}><span className={styles.stepLabel}>وظیفه</span><span className={styles.stepValue}>{t.TaskTitle}</span></div>
                    <span className={styles.flowArrow} aria-hidden="true">←</span>
                    <div className={styles.flowStep}><span className={styles.stepLabel}>استان</span><span className={styles.stepValue}>{t.ProvinceName || "—"}</span></div>
                    <span className={styles.flowArrow} aria-hidden="true">←</span>
                    <div className={styles.flowStep}><span className={styles.stepLabel}>مسئول اجرا</span><span className={styles.stepValue}>{assignees.length ? `${digits(assignees.length)} نفر` : "تخصیص نیافته"}</span></div>
                  </div>
                  <div className={styles.assignees}>
                    <span className={styles.assigneeHeading}>مسئولان واگذار‌شده</span>
                    {assignees.length ? <div className={styles.personList}>
                      {assignees.map(a => <div className={styles.person} key={a.AssignmentId}>
                        <span className={styles.personName}>{a.AssigneeName}</span>
                        <span className={styles.personInfo}>{digits(a.ReportCount)} گزارش</span>
                        <span className={styles.personInfo}>عملکرد تأییدشده: {digits(a.ApprovedValue)}</span>
                      </div>)}
                    </div> : <span className={styles.noAssignee}>برای این هدف هنوز مسئول اجرایی تعیین نشده است.</span>}
                  </div>
                </div>
              </details>;
            })}
          </div> : <p className={styles.empty}>هنوز هدف و واگذاری مرتبطی ثبت نشده است.</p>}
        </section>}
      </>}
    </main>
  </PanelPage>;
}
