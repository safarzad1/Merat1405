"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Dropdown } from "@/component/Dropdown";
import styles from "./Hamkari.module.css";

type Job = {
  JobId: number; Vazeyat: number; VazeyatShoghl: number; NoeSazman: number; SathSazmani: number; PostSazmani: number;
  Semat: string; NameShoghl: string; OnvanMasoliat: string; AzTarikh: string; TaTarikh: string;
  Mahal: number; Neshani: string; PhoneNumber: string; Tozihat: string;
  VazeyatName?: string; VazeyatShoghlName?: string; SathSazmaniName?: string; MahalName?: string;
};
type Option = { value: number; label: string };
const emptyJob: Job = { JobId: 0, Vazeyat: 0, VazeyatShoghl: 0, NoeSazman: 0, SathSazmani: 0, PostSazmani: 0, Semat: "", NameShoghl: "", OnvanMasoliat: "", AzTarikh: "", TaTarikh: "", Mahal: 0, Neshani: "", PhoneNumber: "", Tozihat: "" };

async function post(url: string, data: object) {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
  const result = await res.json();
  if (!res.ok || result.status !== 200) throw new Error(result.error || "خطا در دریافت اطلاعات");
  return result.data;
}

export default function JobHistoryPanel({ personId, userId, rootMahal }: { personId: number; userId: number; rootMahal: number }) {
  const [rows, setRows] = useState<Job[]>([]);
  const [lookups, setLookups] = useState<Record<number, Option[]>>({});
  const [cities, setCities] = useState<Option[]>([]);
  const [draft, setDraft] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!personId) return;
    setLoading(true);
    try { setRows(await post("/Api/Hamkari/PersonJobs", { action: "list", personId })); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "خطا در بارگذاری سوابق"); }
    finally { setLoading(false); }
  }, [personId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    let active = true;
    Promise.all([1041, 1042, 1043, 1044, 1045].map(async (pid) => {
      const data = await post("/Api/DFN/GetDFnByPID", { pid });
      return [pid, (Array.isArray(data) ? data : []).map((r: { Value: number; NameFarsi: string }) => ({ value: Number(r.Value), label: String(r.NameFarsi) }))] as const;
    })).then((items) => { if (active) setLookups(Object.fromEntries(items)); }).catch(() => { if (active) setError("دریافت فهرست وضعیت‌های شغلی ناموفق بود."); });
    if (rootMahal) post("/Api/Citys/GetCitys", { pcityId: rootMahal }).then((data) => {
      if (active) setCities((Array.isArray(data) ? data : []).map((r: { CityId: number; FullName: string }) => ({ value: Number(r.CityId), label: String(r.FullName) })));
    }).catch(() => {});
    return () => { active = false; };
  }, [rootMahal]);

  const update = (key: keyof Job, value: string | number) => setDraft((old) => old ? { ...old, [key]: value } : old);
  const select = (label: string, key: keyof Job, pid: number, required = false) => (
    <label className={styles.jobField}><span>{label}{required ? " *" : ""}</span>
      <Dropdown<number> value={Number(draft?.[key]) || null} options={lookups[pid] || []} onChange={(v) => update(key, Number(v) || 0)} placeholder="انتخاب کنید" />
    </label>
  );
  const field = (label: string, key: keyof Job, required = false) => (
    <label className={styles.jobField}><span>{label}{required ? " *" : ""}</span>
      <input value={String(draft?.[key] ?? "")} onChange={(e) => update(key, e.target.value)} maxLength={key === "AzTarikh" || key === "TaTarikh" ? 10 : 250} />
    </label>
  );
  const save = async () => {
    if (!draft || saving) return;
    if (!draft.Vazeyat || !draft.NameShoghl.trim()) { setError("وضعیت و نام شغل را تکمیل کنید."); return; }
    setSaving(true); setError("");
    try { await post("/Api/Hamkari/PersonJobs", { action: "save", personId, userId, jobId: draft.JobId, job: draft }); setDraft(null); setNotice("سابقه شغلی ذخیره شد."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "ذخیره ناموفق بود."); }
    finally { setSaving(false); }
  };
  const remove = async (job: Job) => {
    if (!await meratConfirm(`سابقه شغلی «${job.NameShoghl || "بدون عنوان"}» حذف شود؟`)) return;
    setError("");
    try { await post("/Api/Hamkari/PersonJobs", { action: "delete", personId, userId, jobId: job.JobId }); setNotice("سابقه حذف شد."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "حذف ناموفق بود."); }
  };

  return <section className={styles.jobPanel} dir="rtl">
    <div className={styles.jobToolbar}><div><strong>سوابق شغلی فرد</strong><span>{rows.length.toLocaleString("fa-IR")} سابقه ثبت‌شده</span></div><button type="button" onClick={() => { setDraft({ ...emptyJob }); setError(""); }}><Plus size={17} /> افزودن سابقه شغلی</button></div>
    {notice && <p className={styles.jobSuccess} role="status">{notice}</p>}
    {!draft && error && <p className={styles.jobError} role="alert">{error}</p>}
    <div className={styles.jobTableScroll}><table className={styles.jobTable}><thead><tr><th>ردیف</th><th>وضعیت</th><th>وضعیت شغلی</th><th>نام شغل</th><th>سطح سازمان</th><th>عنوان مسئولیت</th><th>از سال</th><th>تا سال</th><th>تلفن ثابت</th><th>عملیات</th></tr></thead><tbody>
      {rows.map((row, i) => <tr key={row.JobId}><td>{(i + 1).toLocaleString("fa-IR")}</td><td><span className={styles.jobStatus}>{row.VazeyatName || "—"}</span></td><td>{row.VazeyatShoghlName || "—"}</td><td className={styles.jobName}>{row.NameShoghl || "—"}</td><td>{row.SathSazmaniName || "—"}</td><td>{row.OnvanMasoliat || "—"}</td><td>{row.AzTarikh || "—"}</td><td>{row.TaTarikh || "—"}</td><td dir="ltr">{row.PhoneNumber || "—"}</td><td><div className={styles.jobActions}><button type="button" aria-label="ویرایش" title="ویرایش" onClick={() => { setDraft({ ...row }); setError(""); }}><Pencil size={16} /></button><button type="button" aria-label="حذف" title="حذف" onClick={() => void remove(row)}><Trash2 size={16} /></button></div></td></tr>)}
      {!loading && rows.length === 0 && <tr><td colSpan={10} className={styles.jobEmpty}>برای این فرد هنوز سابقه شغلی ثبت نشده است.</td></tr>}
      {loading && <tr><td colSpan={10} className={styles.jobEmpty}>در حال دریافت سوابق شغلی...</td></tr>}
    </tbody></table></div>
    {draft && <div className={styles.jobOverlay} role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) setDraft(null); }}><div className={styles.jobDialog} role="dialog" aria-modal="true" aria-label={draft.JobId ? "ویرایش سابقه شغلی" : "افزودن سابقه شغلی"}>
      <div className={`${styles.jobDialogHeader} merat-modal-tone--neutral`}><strong>{draft.JobId ? "ویرایش سابقه شغلی" : "ثبت سابقه شغلی جدید"}</strong><button type="button" onClick={() => setDraft(null)} aria-label="بستن"><X size={20} /></button></div>
      <div className={styles.jobForm}>
        {select("وضعیت", "Vazeyat", 1041, true)}{select("وضعیت شغلی", "VazeyatShoghl", 1042)}
        {select("سطح سازمانی", "SathSazmani", 1045)}{select("نوع سازمان", "NoeSazman", 1043)}
        {field("نام شغل", "NameShoghl", true)}{field("عنوان مسئولیت", "OnvanMasoliat")}
        {field("سمت", "Semat")}{select("پست سازمانی", "PostSazmani", 1044)}
        <label className={styles.jobField}><span>محل کار</span><Dropdown<number> value={draft.Mahal || null} options={cities} onChange={(v) => update("Mahal", Number(v) || 0)} placeholder="انتخاب محل کار" /></label>
        {field("از سال", "AzTarikh")}{field("تا سال", "TaTarikh")}{field("تلفن محل کار", "PhoneNumber")}
        <label className={`${styles.jobField} ${styles.jobWide}`}><span>نشانی محل کار</span><textarea rows={2} maxLength={1500} value={draft.Neshani || ""} onChange={(e) => update("Neshani", e.target.value)} /></label>
        <label className={`${styles.jobField} ${styles.jobWide}`}><span>توضیحات</span><textarea rows={3} maxLength={2500} value={draft.Tozihat || ""} onChange={(e) => update("Tozihat", e.target.value)} /></label>
      </div>
      {error && <p className={styles.jobError} role="alert">{error}</p>}
      <div className={styles.jobFooter}><button type="button" onClick={() => setDraft(null)} disabled={saving}>انصراف</button><button type="button" onClick={() => void save()} disabled={saving}>{saving ? "در حال ذخیره..." : "ذخیره سابقه شغلی"}</button></div>
    </div></div>}
  </section>;
}
