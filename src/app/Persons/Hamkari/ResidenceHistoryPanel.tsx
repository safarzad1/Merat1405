"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Dropdown } from "@/component/Dropdown";
import styles from "./Hamkari.module.css";

type Residence = {
  ResidenceId: number; Vazeyat: number; Mahal: number; Tel: string; AzTarikh: string;
  TaTarikh: string; Neshani: string; CodePosti: string;
  VazeyatName?: string; MahalName?: string;
};
type Option = { value: number; label: string };
const blank: Residence = { ResidenceId: 0, Vazeyat: 0, Mahal: 0, Tel: "", AzTarikh: "", TaTarikh: "", Neshani: "", CodePosti: "" };

async function post(url: string, data: object) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data), cache: "no-store" });
  const result = await response.json();
  if (!response.ok || result.status !== 200) throw new Error(result.error || "خطا در ارتباط با سرور");
  return result.data;
}

export default function ResidenceHistoryPanel({ personId, userId, rootMahal }: { personId: number; userId: number; rootMahal: number }) {
  const [rows, setRows] = useState<Residence[]>([]);
  const [statuses, setStatuses] = useState<Option[]>([]);
  const [cities, setCities] = useState<Option[]>([]);
  const [draft, setDraft] = useState<Residence | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    if (!personId) return;
    setBusy(true);
    try { setRows(await post("/Api/Hamkari/PersonResidences", { action: "list", personId })); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "دریافت سوابق سکونت ناموفق بود."); }
    finally { setBusy(false); }
  }, [personId]);
  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    let active = true;
    post("/Api/DFN/GetDFnByPID", { pid: 1051 }).then(data => {
      if (active) setStatuses((Array.isArray(data) ? data : []).map((item: { Value: number; NameFarsi: string }) => ({ value: Number(item.Value), label: String(item.NameFarsi) })));
    }).catch(() => { if (active) setError("فهرست وضعیت سکونت دریافت نشد."); });
    if (rootMahal) post("/Api/Citys/GetCitys", { pcityId: rootMahal }).then(data => {
      if (active) setCities((Array.isArray(data) ? data : []).map((item: { CityId: number; FullName: string }) => ({ value: Number(item.CityId), label: String(item.FullName) })));
    }).catch(() => {});
    return () => { active = false; };
  }, [rootMahal]);

  const update = (name: keyof Residence, value: number | string) => setDraft(old => old ? { ...old, [name]: value } : old);
  const field = (label: string, name: keyof Residence, maxLength: number, placeholder = "") => <label className={styles.jobField}>
    <span>{label}</span><input value={String(draft?.[name] ?? "")} maxLength={maxLength} placeholder={placeholder} onChange={e => update(name, e.target.value)} />
  </label>;
  const normalize = (value: string) => value.replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, c => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));

  const save = async () => {
    if (!draft || busy) return;
    const from = normalize(draft.AzTarikh.trim());
    const to = normalize(draft.TaTarikh.trim());
    const postal = normalize(draft.CodePosti.trim());
    if (from && !/^\d{4}$/.test(from) || to && !/^\d{4}$/.test(to)) { setError("سال شروع و پایان باید چهاررقمی باشند."); return; }
    if (from && to && from > to) { setError("سال پایان نمی‌تواند قبل از سال شروع باشد."); return; }
    if (postal && !/^\d{10}$/.test(postal)) { setError("کدپستی باید ۱۰ رقم باشد."); return; }
    setBusy(true); setError("");
    try {
      await post("/Api/Hamkari/PersonResidences", { action: "save", personId, userId, residenceId: draft.ResidenceId, residence: { ...draft, AzTarikh: from, TaTarikh: to, CodePosti: postal } });
      setDraft(null); setNotice("سابقه سکونت ذخیره شد."); await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "ذخیره ناموفق بود."); }
    finally { setBusy(false); }
  };
  const remove = async (residence: Residence) => {
    if (!await meratConfirm(`سابقه سکونت «${residence.MahalName || residence.Neshani || "بدون عنوان"}» حذف شود؟`)) return;
    setError("");
    try { await post("/Api/Hamkari/PersonResidences", { action: "delete", personId, userId, residenceId: residence.ResidenceId }); setNotice("سابقه سکونت حذف شد."); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "حذف ناموفق بود."); }
  };

  return <section dir="rtl" className={styles.jobPanel}>
    <div className={styles.jobToolbar}><div><strong>سوابق سکونت فرد</strong><span>{rows.length.toLocaleString("fa-IR")} سابقه ثبت‌شده</span></div><button type="button" onClick={() => { setDraft({ ...blank }); setError(""); }}><Plus size={17} /> افزودن سابقه سکونت</button></div>
    {notice && <p className={styles.jobSuccess} role="status">{notice}</p>}
    {!draft && error && <p className={styles.jobError} role="alert">{error}</p>}
    <div className={styles.jobTableScroll}><table className={styles.jobTable}><thead><tr>
      <th>ردیف</th><th>وضعیت سکونت</th><th>محل سکونت</th><th>از سال</th><th>تا سال</th><th>تلفن</th><th>کدپستی</th><th>نشانی</th><th>عملیات</th>
    </tr></thead><tbody>
      {rows.map((r, i) => <tr key={r.ResidenceId}><td>{(i + 1).toLocaleString("fa-IR")}</td><td><span className={styles.jobStatus}>{r.VazeyatName || "—"}</span></td><td className={styles.jobName}>{r.MahalName || "—"}</td><td>{r.AzTarikh || "—"}</td><td>{r.TaTarikh || "—"}</td><td dir="ltr">{r.Tel || "—"}</td><td>{r.CodePosti || "—"}</td><td title={r.Neshani || ""}>{r.Neshani ? r.Neshani.slice(0, 65) + (r.Neshani.length > 65 ? "…" : "") : "—"}</td><td><div className={styles.jobActions}><button type="button" title="ویرایش" aria-label="ویرایش" onClick={() => { setDraft({ ...r }); setError(""); }}><Pencil size={16} /></button><button type="button" title="حذف" aria-label="حذف" onClick={() => void remove(r)}><Trash2 size={16} /></button></div></td></tr>)}
      {rows.length === 0 && <tr><td colSpan={9} className={styles.jobEmpty}>{busy ? "در حال دریافت سوابق سکونت..." : "هنوز سابقه سکونت ثبت نشده است."}</td></tr>}
    </tbody></table></div>
    {draft && <div className={styles.jobOverlay} onMouseDown={e => { if (e.target === e.currentTarget && !busy) setDraft(null); }}><div className={styles.jobDialog} role="dialog" aria-modal="true" aria-label="فرم سابقه سکونت">
      <div className={`${styles.jobDialogHeader} merat-modal-tone--neutral`}><strong>{draft.ResidenceId ? "ویرایش سابقه سکونت" : "ثبت سابقه سکونت"}</strong><button type="button" aria-label="بستن" onClick={() => setDraft(null)}><X size={20} /></button></div>
      <div className={styles.jobForm}>
        <label className={styles.jobField}><span>وضعیت سکونت</span><Dropdown<number> value={draft.Vazeyat || null} options={statuses} onChange={v => update("Vazeyat", Number(v) || 0)} placeholder="انتخاب وضعیت" /></label>
        <label className={styles.jobField}><span>محل سکونت</span><Dropdown<number> value={draft.Mahal || null} options={cities} onChange={v => update("Mahal", Number(v) || 0)} placeholder="انتخاب شهر / محل" /></label>
        {field("از سال", "AzTarikh", 4, "مثلاً ۱۳۹۸")}{field("تا سال", "TaTarikh", 4, "در صورت سکونت فعلی خالی بماند")}
        {field("تلفن محل سکونت", "Tel", 30)}{field("کدپستی", "CodePosti", 10)}
        <label className={`${styles.jobField} ${styles.jobWide}`}><span>نشانی کامل</span><textarea rows={4} maxLength={1000} value={draft.Neshani || ""} onChange={e => update("Neshani", e.target.value)} /></label>
      </div>
      {error && <p className={styles.jobError} role="alert">{error}</p>}
      <div className={styles.jobFooter}><button type="button" disabled={busy} onClick={() => setDraft(null)}>انصراف</button><button type="button" disabled={busy} onClick={() => void save()}>{busy ? "در حال ذخیره..." : "ذخیره سابقه سکونت"}</button></div>
    </div></div>}
  </section>;
}
