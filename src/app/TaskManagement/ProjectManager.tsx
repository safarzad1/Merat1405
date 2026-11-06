"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./ProjectManager.module.css";
import NewsJalaliDatePicker from "@/app/AkhbarManage/NewsJalaliDatePicker";
import TargetPlanning from "./TargetPlanning";

type ProjectRow = {
  ProjectId: number;
  Title: string;
  StatusCode: string;
  StartDatePersian: string | null;
  EndDatePersian: string | null;
  TaskCount: number;
};
type ProjectDetails = ProjectRow & { Description: string | null };
type TaskRow = {
  TaskId: number;
  ProjectId: number;
  Title: string;
  Description: string | null;
  StartDatePersian: string | null;
  DueDatePersian: string | null;
  TargetCount: number;
};
type FormValues = { title: string; description: string; startDate: string; endDate: string };
type Editing = { kind: "project" | "task"; id: number | null; projectId?: number };
type Confirmation = { action: "setStatus" | "removeProject" | "removeTask"; id: number; status?: string; message: string };
const blankForm: FormValues = { title: "", description: "", startDate: "", endDate: "" };
const fmt = (v: number) => new Intl.NumberFormat("fa-IR").format(Number(v) || 0);
const persian = (v: string | null | undefined) => v ? v.replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]) : "—";
const stateText = (v: string) => v === "ACTIVE" ? "فعال" : v === "CLOSED" ? "بسته‌شده" : "پیش‌نویس";
const dateRegex = /^1[3-5]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/;
const numbers = (s: string) => s.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export default function ProjectManager({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(null);
  const [planningTaskId, setPlanningTaskId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProjectDetails | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState<Editing | null>(null);
  const [form, setForm] = useState<FormValues>(blankForm);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  async function retrieve(id: number) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/Api/TaskManagement/Projects?projectId=${id}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(String(data.error || "دریافت وظایف انجام نشد."));
      setDetail(data.project as ProjectDetails);
      setTasks(data.tasks as TaskRow[]);
      return data.project as ProjectDetails;
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات"); }
    finally { setLoading(false); }
  }
  async function selectProject(id: number) {
    setPlanningTaskId(null);
    if (selected === id) { setSelected(null); setDetail(null); setTasks([]); return; }
    setSelected(id);
    setDetail(null);
    setTasks([]);
    await retrieve(id);
  }
  function openProject(p?: ProjectRow, full?: ProjectDetails) {
    setError("");
    setEditing({ kind: "project", id: p?.ProjectId ?? null });
    const source = full ?? (p && detail?.ProjectId === p.ProjectId ? detail : p);
    setForm({ title: source?.Title ?? "", description: source && "Description" in source ? String(source.Description ?? "") : "",
      startDate: source?.StartDatePersian ?? "", endDate: source?.EndDatePersian ?? "" });
  }
  async function editProject(p: ProjectRow) {
    setSelected(p.ProjectId);
    const full = await retrieve(p.ProjectId);
    if (full) openProject(p, full);
  }
  function openTask(t?: TaskRow) {
    if (!selected) return;
    setError("");
    setEditing({ kind: "task", id: t?.TaskId ?? null, projectId: selected });
    setForm({ title: t?.Title ?? "", description: t?.Description ?? "", startDate: t?.StartDatePersian ?? "", endDate: t?.DueDatePersian ?? "" });
  }
  async function request(action: string, data: Record<string, unknown>) {
    const response = await fetch("/Api/TaskManagement/Projects", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...data })
    });
    const content = await response.json();
    if (!response.ok || !content.success) throw new Error(String(content.error || "ثبت اطلاعات انجام نشد."));
    return content;
  }
  async function save() {
    if (!editing || busy) return;
    const title = form.title.trim();
    if (!title || title.length > 200) { setError("عنوان باید بین یک تا ۲۰۰ نویسه باشد."); return; }
    if (form.description.length > 4000) { setError("توضیحات بیش از ۴۰۰۰ نویسه نباشد."); return; }
    const startDate = numbers(form.startDate.trim().replace(/-/g, "/"));
    const endDate = numbers(form.endDate.trim().replace(/-/g, "/"));
    if ((startDate && !dateRegex.test(startDate)) || (endDate && !dateRegex.test(endDate)) || (startDate && endDate && startDate > endDate)) {
      setError("تاریخ‌ها را مانند ۱۴۰۵/۰۸/۱۵ وارد کنید؛ پایان نباید قبل از شروع باشد."); return;
    }
    setBusy(true); setError("");
    try {
      const result = await request(editing.kind === "project" ? "saveProject" : "saveTask", {
        projectId: editing.projectId ?? editing.id, taskId: editing.kind === "task" ? editing.id : undefined,
        title, description: form.description.trim(), startDate, endDate
      });
      const id = editing.kind === "project" ? Number(result.result?.ProjectId) : selected;
      setEditing(null); setMessage("اطلاعات با موفقیت ثبت شد.");
      if (id) { setSelected(id); await retrieve(id); }
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت اطلاعات انجام نشد."); }
    finally { setBusy(false); }
  }
  async function confirmAction() {
    if (!confirmation || busy) return;
    setBusy(true); setError("");
    const { action, id, status } = confirmation;
    try {
      await request(action, action === "removeTask" ? { taskId: id } : { projectId: id, status });
      setConfirmation(null); setMessage("عملیات با موفقیت ثبت شد.");
      if (action === "removeProject") { setSelected(null); setDetail(null); setTasks([]); }
      else if (selected) await retrieve(selected);
      router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "عملیات انجام نشد."); }
    finally { setBusy(false); }
  }
  const active = projects.find(p => p.ProjectId === selected);
  const isClosed = (detail ?? active)?.StatusCode === "CLOSED";
  return <section className={styles.container} aria-label="مدیریت پروژه‌ها و وظایف ستاد">
    <div className={styles.toolbar}>
      <div className={styles.toolbarTitle}><span>پروژه‌ها و وظایف ستاد</span><span className={styles.counter}>{fmt(projects.length)}</span></div>
      <button type="button" onClick={() => openProject()} className={styles.primary}>+ افزودن پروژه</button>
    </div>
    {message && <div className={styles.success} role="status">{message}<button type="button" onClick={() => setMessage("")}>×</button></div>}
    {error && !editing && !confirmation && <div className={styles.error} role="alert">{error}</div>}
    {projects.length === 0 ? <div className={styles.empty}>پروژه‌ای ثبت نشده است. برای شروع، پروژه جدید ایجاد کنید.</div> :
      <div className={styles.projectList}>{projects.map(p => <div className={`${styles.project} ${selected === p.ProjectId ? styles.projectSelected : ""}`} key={p.ProjectId}>
        <div className={styles.projectRow}>
          <button type="button" className={styles.open} onClick={() => selectProject(p.ProjectId)} aria-expanded={selected === p.ProjectId}>
            <span className={styles.arrow}>{selected === p.ProjectId ? "⌃" : "⌄"}</span>
            <span className={styles.projectTitle}>{p.Title}</span>
            <span className={`${styles.status} ${p.StatusCode === "ACTIVE" ? styles.active : p.StatusCode === "CLOSED" ? styles.closed : ""}`}>{stateText(p.StatusCode)}</span>
            <span className={styles.faint}>{fmt(p.TaskCount)} وظیفه</span>
            <span className={styles.faint}>{persian(p.StartDatePersian)} — {persian(p.EndDatePersian)}</span>
          </button>
          <div className={styles.actions}>
            {! (p.StatusCode === "CLOSED") && <button type="button" onClick={() => { void editProject(p); }} aria-label={`ویرایش ${p.Title}`} title="ویرایش پروژه">ویرایش</button>}
            {p.StatusCode === "DRAFT" && <button type="button" onClick={() => setConfirmation({ action: "setStatus", id: p.ProjectId, status: "ACTIVE", message: `پروژه «${p.Title}» فعال شود؟ انتشار برای استان‌ها پس از هدف‌گذاری انجام می‌شود.` })}>فعال‌سازی</button>}
            {p.StatusCode === "ACTIVE" && <button type="button" onClick={() => setConfirmation({ action: "setStatus", id: p.ProjectId, status: "CLOSED", message: `پروژه «${p.Title}» بسته شود؟ تا زمان بازگشایی قابل ویرایش نخواهد بود.` })}>بستن پروژه</button>}
            {p.StatusCode === "CLOSED" && <button type="button" onClick={() => setConfirmation({ action: "setStatus", id: p.ProjectId, status: "ACTIVE", message: `پروژه «${p.Title}» مجدداً فعال شود؟` })}>بازگشایی</button>}
            {p.StatusCode === "DRAFT" && <button type="button" className={styles.danger} onClick={() => setConfirmation({ action: "removeProject", id: p.ProjectId, message: `پروژه «${p.Title}» حذف شود؟ پروژه‌های دارای هدف‌گذاری قابل حذف نیستند.` })}>حذف</button>}
          </div>
        </div>
        {selected === p.ProjectId && <div className={styles.detail}>
          {loading ? <div className={styles.empty}>در حال دریافت وظایف...</div> : <>
            {detail?.Description && <div className={styles.description}>{detail.Description}</div>}
            <div className={styles.taskHeader}><span>وظایف پروژه <span className={styles.counter}>{fmt(tasks.length)}</span></span>
              {!isClosed && <button type="button" className={styles.secondary} onClick={() => openTask()}>+ افزودن وظیفه</button>}
            </div>
            {tasks.length === 0 ? <div className={styles.empty}>هنوز وظیفه‌ای برای این پروژه ثبت نشده است.</div> :
              <div className={styles.tasks}>{tasks.map((t, i) => <div className={styles.taskBlock} key={t.TaskId}><div className={styles.task}>
                <span className={styles.taskNumber}>{fmt(i+1)}</span>
                <div className={styles.taskText}><span className={styles.taskTitle}>{t.Title}</span>
                  {t.Description && <span className={styles.taskDesc}>{t.Description}</span>}
                  <span className={styles.taskMeta}>{persian(t.StartDatePersian)} — {persian(t.DueDatePersian)} · {fmt(t.TargetCount)} هدف</span>
                </div>
                <div className={styles.taskButtons}>
                  <button type="button" className={styles.planningButton} onClick={() => setPlanningTaskId(old => old === t.TaskId ? null : t.TaskId)} aria-expanded={planningTaskId === t.TaskId}>
                    {planningTaskId === t.TaskId ? "بستن هدف‌گذاری" : "هدف‌گذاری و تخصیص"}
                  </button>
                {!isClosed && <>
                  <button type="button" onClick={() => openTask(t)}>ویرایش</button>
                  <button type="button" className={styles.danger} disabled={Number(t.TargetCount)>0} title={t.TargetCount ? "این وظیفه دارای هدف است و قابل حذف نیست." : "حذف وظیفه"}
                    onClick={() => setConfirmation({ action: "removeTask", id: t.TaskId, message: `وظیفه «${t.Title}» حذف شود؟` })}>حذف</button>
                </>}
                </div>
              </div>
              {planningTaskId === t.TaskId && <TargetPlanning taskId={t.TaskId} taskTitle={t.Title} projectStatus={detail?.StatusCode ?? "DRAFT"} onChanged={() => { void retrieve(t.ProjectId); }} />}
              </div>)}</div>}
          </>}
        </div>}
      </div>)}</div>}
    {editing && <div className={styles.backdrop} role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setEditing(null); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label={editing.kind === "project" ? "فرم پروژه" : "فرم وظیفه"} dir="rtl">
        <div className={styles.modalHead}><h3>{editing.id ? "ویرایش" : "افزودن"} {editing.kind === "project" ? "پروژه" : "وظیفه"}</h3><button type="button" onClick={() => setEditing(null)} disabled={busy} aria-label="بستن">×</button></div>
        <div className={styles.modalBody}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>عنوان <span className={styles.required} aria-hidden="true">*</span></span>
            <input autoFocus required maxLength={200} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={editing.kind === "project" ? "عنوان پروژه" : "عنوان وظیفه"}/>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>توضیحات</span>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={4000} placeholder="توضیحات (اختیاری)"/>
          </label>
          <div className={styles.dateFields}>
            <div className={styles.field}><span>تاریخ شروع (شمسی)</span><NewsJalaliDatePicker value={form.startDate} label="تاریخ شروع" onChange={v => setForm(f => ({...f, startDate: v}))}/></div>
            <div className={styles.field}><span>تاریخ پایان (شمسی)</span><NewsJalaliDatePicker value={form.endDate} label="تاریخ پایان" onChange={v => setForm(f => ({...f, endDate: v}))}/></div>
          </div>
          {error && <div role="alert" className={styles.error}>{error}</div>}
        </div>
        <div className={styles.modalFooter}><button type="button" onClick={() => setEditing(null)} disabled={busy}>انصراف</button><button type="button" disabled={busy} onClick={save} className={styles.primary}>{busy ? "در حال ثبت..." : "ذخیره اطلاعات"}</button></div>
      </div>
    </div>}
    {confirmation && <div className={styles.backdrop} role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setConfirmation(null); }}>
      <div className={styles.confirm} role="alertdialog" aria-modal="true" aria-label="تأیید عملیات" dir="rtl">
        <h3>تأیید عملیات</h3><p>{confirmation.message}</p>
        {error && <div role="alert" className={styles.error}>{error}</div>}
        <div className={styles.modalFooter}><button type="button" onClick={() => { setConfirmation(null); setError(""); }} disabled={busy}>انصراف</button>
          <button type="button" onClick={confirmAction} disabled={busy} className={confirmation.action.startsWith("remove") ? styles.dangerButton : styles.primary}>{busy ? "در حال ثبت..." : "تأیید و ثبت"}</button></div>
      </div>
    </div>}
  </section>;
}
