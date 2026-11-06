"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./TargetPlanning.module.css";
import Dropdown from "@/component/Dropdown";

type Province = { ProvinceCityId: number; ProvinceName: string };
type StaffUser = { UserId: number; FullName: string; PostId: number; PostName: string };
type Target = {
  TargetId: number; TaskId: number; ProvinceCityId: number; ProvinceName: string;
  PersianYear: number; Quarter: number; TargetValue: number;
  IsPublished: boolean | number; AssigneeCount: number; RecordCount: number;
};
type Assignment = { AssignmentId: number; TargetId: number; UserId: number; AssigneeName: string; PostId: number };
type TargetForm = { provinceId: string; year: string; quarter: string; value: string; id: number | null };
type Confirm = { operation: "publishTarget" | "removeTarget"; targetId: number; publish?: boolean; message: string };
const blank: TargetForm = { provinceId: "", year: "1405", quarter: "1", value: "", id: null };
const quarters = ["", "بهار", "تابستان", "پاییز", "زمستان"];
const fmt = (n: number) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(Number(n) || 0);
const simpleDigits = (s: string | number) => String(s).replace(/[0-9]/g, d => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
const latin = (s: string) => s.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export default function TargetPlanning({ taskId, taskTitle, projectStatus, onChanged }: { taskId: number; taskTitle: string; projectStatus: string; onChanged?: () => void }) {
  const router = useRouter();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [selection, setSelection] = useState<number | null>(null);
  const [form, setForm] = useState<TargetForm | null>(null);
  const [assignUser, setAssignUser] = useState("");
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const selected = targets.find(t => t.TargetId === selection) ?? null;
  const isClosed = projectStatus === "CLOSED";

  const refresh = useCallback(async () => {
    const res = await fetch(`/Api/TaskManagement/Planning?taskId=${taskId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(String(data.error || "دریافت هدف‌ها انجام نشد."));
    setProvinces(data.provinces ?? []);
    setTargets(data.targets ?? []);
    setAssignments(data.assignments ?? []);
  }, [taskId]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    refresh().catch(e => { if (live) setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات"); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [refresh]);

  useEffect(() => {
    const provinceId = selected?.ProvinceCityId;
    if (!provinceId || isClosed || Boolean(selected?.IsPublished)) { setUsers([]); return; }
    let alive = true;
    setUsersLoading(true);
    fetch(`/Api/TaskManagement/Planning?provinceId=${provinceId}`, { cache: "no-store" })
      .then(async response => { const d = await response.json(); if (!response.ok) throw new Error(d.error || "خطا در دریافت کاربران"); return d; })
      .then(d => { if (alive) setUsers(d.users ?? []); })
      .catch(e => { if (alive) { setUsers([]); setError(e instanceof Error ? e.message : "دریافت کاربران ناموفق بود."); } })
      .finally(() => { if (alive) setUsersLoading(false); });
    return () => { alive = false; };
  }, [selected?.ProvinceCityId, selected?.IsPublished, isClosed]);

  const currentAssignees = assignments.filter(a => a.TargetId === selection);
  async function mutation(payload: Record<string, unknown>) {
    const res = await fetch("/Api/TaskManagement/Planning", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(String(data.error || "عملیات انجام نشد."));
    return data;
  }
  async function run(action: () => Promise<void>, success: string) {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try { await action(); await refresh(); setNotice(success); onChanged?.(); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "عملیات انجام نشد."); }
    finally { setBusy(false); }
  }
  function startEdit(t?: Target) {
    setNotice(""); setError("");
    setForm(t ? { id: t.TargetId, provinceId: String(t.ProvinceCityId), year: String(t.PersianYear), quarter: String(t.Quarter), value: String(t.TargetValue) } : { ...blank });
  }
  async function saveForm() {
    if (!form) return;
    const y = Number(latin(form.year));
    const v = Number(latin(form.value).replace(/٫/g,"."));
    if (!form.provinceId || !Number.isInteger(y) || y < 1300 || y > 1600 ||
        !Number.isFinite(v) || form.value.trim()==="" || v < 0 || Math.abs(Math.round(v * 100) - v * 100) > 1e-7) {
      setError("استان، سال معتبر و مقدار هدف نامنفی را وارد کنید."); return;
    }
    await run(async () => {
      const result = await mutation({ action: "saveTarget", targetId: form.id, taskId, provinceId: Number(form.provinceId),
        year: y, quarter: Number(form.quarter), value: v });
      setSelection(Number(result.result?.TargetId) || form.id || null);
      setForm(null);
    }, "هدف فصلی ثبت شد.");
  }
  async function assign(active: boolean, userId: number) {
    if (!selected) return;
    await run(async () => {
      await mutation({ action: "setAssignee", targetId: selected.TargetId, assigneeUserId: userId, active });
      setAssignUser("");
    }, active ? "مسئول به هدف تخصیص داده شد." : "انتساب مسئول لغو شد.");
  }
  async function confirmAction() {
    if (!confirm) return;
    const current = confirm;
    await run(async () => {
      if (current.operation === "publishTarget") await mutation({ action: "publishTarget", targetId: current.targetId, publish: Boolean(current.publish) });
      else await mutation({ action: "removeTarget", targetId: current.targetId });
      setConfirm(null);
      setSelection(null);
    }, current.operation === "removeTarget" ? "هدف حذف شد." : current.publish ? "هدف برای استان منتشر شد." : "انتشار هدف لغو شد.");
  }

  return <div className={styles.shell} dir="rtl">
    <header className={styles.head}>
      <span>هدف‌گذاری و واگذاری: <span className={styles.taskName}>{taskTitle}</span></span>
      {!isClosed && <button type="button" className={styles.add} onClick={() => startEdit()}>+ هدف جدید</button>}
    </header>
    {notice && <div className={styles.notice} role="status">{notice}</div>}
    {error && <div className={styles.error} role="alert">{error}</div>}
    {loading ? <p className={styles.empty}>در حال دریافت اهداف...</p> : targets.length === 0 ?
      <p className={styles.empty}>هنوز هدفی برای این وظیفه تعریف نشده است.</p> :
      <div className={styles.items}>{targets.map(t => <button type="button" key={t.TargetId} className={`${styles.item} ${selection === t.TargetId ? styles.chosen : ""}`}
        onClick={() => { setSelection(selection === t.TargetId ? null : t.TargetId); setForm(null); setError(""); setNotice(""); }} aria-expanded={selection === t.TargetId}>
        <span className={styles.province}>{t.ProvinceName}</span>
        <span>{quarters[t.Quarter]} {simpleDigits(t.PersianYear)}</span>
        <span>هدف: {fmt(t.TargetValue)}</span>
        <span>{fmt(t.AssigneeCount)} مسئول</span>
        <span className={`${styles.marker} ${Boolean(t.IsPublished) ? styles.published : ""}`}>{Boolean(t.IsPublished) ? "منتشرشده" : "پیش‌نویس"}</span>
        <span className={styles.toggle}>{selection === t.TargetId ? "⌃" : "⌄"}</span>
      </button>)}</div>}

    {selected && <div className={styles.detail}>
      <div className={styles.detailToolbar}>
        <span>مسئولان استان {selected.ProvinceName}</span>
        {!isClosed && !Boolean(selected.IsPublished) && <div className={styles.actions}>
          <button type="button" onClick={() => startEdit(selected)}>ویرایش هدف</button>
          <button type="button" className={styles.remove} disabled={selected.RecordCount > 0} onClick={() => setConfirm({ operation: "removeTarget", targetId: selected.TargetId, message: `هدف ${selected.ProvinceName} حذف شود؟` })}>حذف هدف</button>
        </div>}
      </div>
      {currentAssignees.length ? <div className={styles.people}>{currentAssignees.map(a => <div className={styles.person} key={a.AssignmentId}>
        <span>{a.AssigneeName}</span><span className={styles.muted}>پست {simpleDigits(a.PostId)}</span>
        {!Boolean(selected.IsPublished) && !isClosed && <button type="button" disabled={busy || selected.RecordCount > 0} title="لغو انتساب" onClick={() => assign(false, a.UserId)}>حذف</button>}
      </div>)}</div> : <p className={styles.empty}>مسئولی برای این هدف تعیین نشده است.</p>}
      {!Boolean(selected.IsPublished) && !isClosed && <div className={styles.assignRow}>
        <select aria-label="مسئول استان" value={assignUser} onChange={e=>setAssignUser(e.target.value)} disabled={busy || usersLoading}>
          <option value="">{usersLoading ? "دریافت کاربران استان..." : "انتخاب مسئول استان"}</option>
          {users.filter(u=>!currentAssignees.some(a=>a.UserId===u.UserId)).map(u=><option value={u.UserId} key={u.UserId}>{u.FullName} — {u.PostName || `پست ${simpleDigits(u.PostId)}`}</option>)}
        </select>
        <button type="button" disabled={!assignUser || busy} onClick={()=>assign(true,Number(assignUser))}>افزودن مسئول</button>
      </div>}
      <div className={styles.publishRow}>
        <span className={styles.muted}>{Boolean(selected.IsPublished) ? "این مأموریت در پیشخوان استان قابل مشاهده است." : "تا قبل از انتشار، استان این هدف را مشاهده نمی‌کند."}</span>
        {!isClosed && (Boolean(selected.IsPublished) ?
          <button type="button" className={styles.secondary} disabled={busy || selected.RecordCount > 0} onClick={()=>setConfirm({ operation:"publishTarget", targetId:selected.TargetId, publish:false, message:"انتشار این هدف لغو شود؟ تا انتشار مجدد برای استان نمایش داده نخواهد شد." })}>لغو انتشار</button> :
          <button type="button" className={styles.add} disabled={busy || currentAssignees.length===0 || projectStatus!=="ACTIVE"} onClick={()=>setConfirm({ operation:"publishTarget", targetId:selected.TargetId, publish:true, message:`هدف ${quarters[selected.Quarter]} ${simpleDigits(selected.PersianYear)} استان ${selected.ProvinceName} با مقدار ${fmt(selected.TargetValue)} برای ${fmt(currentAssignees.length)} مسئول منتشر شود؟` })}>انتشار برای استان</button>)}
      </div>
    </div>}

    {form && <div className={styles.backdrop} role="presentation" onMouseDown={e=>{ if(e.target===e.currentTarget&&!busy) setForm(null); }}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="فرم هدف فصلی">
        <div className={styles.modalHead}><h3>{form.id ? "ویرایش هدف فصلی" : "افزودن هدف فصلی"}</h3><button type="button" onClick={()=>setForm(null)} disabled={busy} aria-label="بستن">×</button></div>
        <form onSubmit={e=>{e.preventDefault();void saveForm();}}>
          <div className={styles.formFields}>
            <div className={styles.field}>
              <span className={styles.fieldTitle}>استان <span className={styles.star} aria-hidden="true">*</span></span>
              <Dropdown<string>
                className={styles.dropdownField}
                ariaLabel="انتخاب استان (الزامی)"
                value={form.provinceId}
                options={provinces.map(p => ({ value: String(p.ProvinceCityId), label: p.ProvinceName }))}
                onChange={provinceId => setForm(f => f ? { ...f, provinceId } : f)}
                placeholder="جستجو و انتخاب استان"
                searchable
                searchPlaceholder="جستجوی نام استان..."
                emptyText="استانی برای انتخاب وجود ندارد."
                maxMenuHeight={260}
                disabled={busy}
                error={!form.provinceId && Boolean(error)}
              />
            </div>
            <div className={styles.dual}>
              <label><span className={styles.fieldTitle}>سال شمسی <span className={styles.star}>*</span></span><input type="text" inputMode="numeric" required maxLength={4} value={form.year} onChange={e=>setForm(f=>f?{...f,year:e.target.value}:f)} placeholder="۱۴۰۵"/></label>
              <div className={styles.field}>
                <span className={styles.fieldTitle}>فصل <span className={styles.star} aria-hidden="true">*</span></span>
                <Dropdown<string>
                  className={styles.dropdownField}
                  ariaLabel="انتخاب فصل (الزامی)"
                  value={form.quarter}
                  options={quarters.slice(1).map((q, i) => ({ value: String(i + 1), label: q }))}
                  onChange={quarter => setForm(f => f ? { ...f, quarter } : f)}
                  placeholder="انتخاب فصل"
                  maxMenuHeight={190}
                  disabled={busy}
                />
              </div>
            </div>
            <label><span className={styles.fieldTitle}>مقدار هدف <span className={styles.star}>*</span></span><input type="text" inputMode="decimal" required value={form.value} onChange={e=>setForm(f=>f?{...f,value:e.target.value}:f)} placeholder="مثلاً ۲۰"/></label>
            {error && <div className={styles.error} role="alert">{error}</div>}
          </div>
          <footer className={styles.modalFooter}><button type="button" onClick={()=>setForm(null)} disabled={busy}>انصراف</button><button type="submit" className={styles.add} disabled={busy}>{busy?"در حال ثبت...":"ذخیره هدف"}</button></footer>
        </form>
      </div>
    </div>}
    {confirm && <div className={styles.backdrop} role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setConfirm(null);}}>
      <div className={styles.modal} role="alertdialog" aria-modal="true" aria-label="تأیید عملیات">
        <div className={styles.modalHead}><h3>تأیید عملیات</h3><button type="button" onClick={()=>setConfirm(null)} disabled={busy} aria-label="بستن">×</button></div>
        <p className={styles.confirmText}>{confirm.message}</p>
        {error && <div className={styles.error} role="alert">{error}</div>}
        <footer className={styles.modalFooter}><button type="button" onClick={()=>setConfirm(null)} disabled={busy}>انصراف</button><button type="button" className={styles.add} onClick={confirmAction} disabled={busy}>{busy?"در حال ثبت...":"تأیید و ثبت"}</button></footer>
      </div>
    </div>}
  </div>;
}
