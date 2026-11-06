"use client";

import { meratConfirm } from "@/component/MeratFeedback/feedback";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./NewsReassignment.module.css";

type QueueItem = {
  ShomareKhabar: number; OnvanKhabar: string; CurrentStatusCode: string;
  OldUserId: number; OldPostId: number; OldMahal: number;
  ActiveKartablId: number; OldOwnerName: string; OldPostName: string;
  ReassignmentReason: string; IsBlocked: boolean;
};
type Candidate = { UserId: number; PostId: number; Mahal: number; FullName: string; OnvanPost: string };
type History = { OldUserId: number; NewUserId: number; AdminUserId: number;
  Reason: string; CreatedAtJalali: string; OldName: string; NewName: string; AdminName: string };
const numberFa = (n: number) => Number(n || 0).toLocaleString("fa-IR");

export default function NewsReassignment() {
  const currentCandidateRequest = useRef(0);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState("");
  const [blockedOnly, setBlockedOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<QueueItem | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<History[]>([]);
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("");
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async (query: string, onlyBlocked: boolean) => {
    setLoading(true); setError("");
    try {
      const p = new URLSearchParams({ search: query.trim(), onlyBlocked: onlyBlocked ? "1" : "0" });
      const res = await fetch(`/Api/Akhbar/ReassignmentQueue?${p}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "خطا در دریافت اخبار");
      setItems(data.items || []);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت اخبار"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load("", true); }, [load]);

  async function selectNews(item: QueueItem) {
    const requestNo = ++currentCandidateRequest.current;
    setSelected(item); setCandidates([]); setHistory([]); setTarget(""); setReason("");
    setError(""); setMessage(""); setLoadingCandidates(true);
    try {
      const res = await fetch(`/Api/Akhbar/ReassignmentCandidates?newsNo=${item.ShomareKhabar}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فهرست مسئولان دریافت نشد.");
      if (requestNo === currentCandidateRequest.current) {
        setCandidates(data.candidates || []); setHistory(data.history || []);
      }
    } catch (e) {
      if (requestNo === currentCandidateRequest.current)
        setError(e instanceof Error ? e.message : "خطا در بارگذاری مسئولان");
    } finally { if (requestNo === currentCandidateRequest.current) setLoadingCandidates(false); }
  }

  async function reassign() {
    if (!selected || !target || reason.trim().length < 5 || saving) return;
    if (!await meratConfirm(`انتقال خبر ${numberFa(selected.ShomareKhabar)} به مسئول جدید تأیید می‌شود؟`)) return;
    setSaving(true); setError(""); setMessage("");
    try {
      const res = await fetch("/Api/Akhbar/ReassignNews", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newsNo: selected.ShomareKhabar, targetUserId: Number(target),
          expectedOldUserId: selected.OldUserId, expectedKartablId: selected.ActiveKartablId,
          reason: reason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "بازتخصیص انجام نشد.");
      setMessage(`خبر ${numberFa(selected.ShomareKhabar)} به مسئول جدید منتقل شد و سابقه آن ثبت گردید.`);
      setSelected(null); setCandidates([]); setHistory([]); setTarget(""); setReason("");
      await load(search, blockedOnly);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در انتقال خبر"); }
    finally { setSaving(false); }
  }

  return <section className={styles.root} dir="rtl" aria-label="بازتخصیص اخبار">
    <div className={styles.heading}>
      <div><h2>بازتخصیص مدیریتی اخبار</h2>
        <p>انتقال خبر به مسئول فعالِ هم‌سطح و در همان محل خدمت، با ثبت علت و تاریخچه کامل.</p></div>
    </div>
    <form className={styles.filters} onSubmit={e => { e.preventDefault(); setSelected(null); void load(search, blockedOnly); }}>
      <input value={search} onChange={e => setSearch(e.target.value)} maxLength={120} aria-label="جست‌وجوی خبر"
        placeholder="شماره یا عنوان خبر..." />
      <label className={styles.checkbox}><input type="checkbox" checked={blockedOnly}
        onChange={e => { setBlockedOnly(e.target.checked); setSelected(null); void load(search, e.target.checked); }} />
        فقط اخبار دارای مشکل مسئول</label>
      <button type="submit" disabled={loading}>{loading ? "در حال دریافت..." : "جست‌وجو / به‌روزرسانی"}</button>
    </form>
    {error && <p className={styles.error} role="alert">{error}</p>}
    {message && <p className={styles.success} role="status">{message}</p>}
    <p className={styles.hint}>اخبار دارای کارتابل ناقص یا چند کارتابل فعال عمداً در این فهرست نیستند؛ ابتدا مغایرت آن‌ها را در «کنترل سلامت گردش اخبار» بررسی کنید.</p>
    <div className={styles.layout}>
      <div className={styles.list}>
        {items.length === 0 && !loading ? <p className={styles.empty}>خبری مطابق فیلتر فعلی پیدا نشد.</p> : null}
        {items.map(item => <button type="button" key={item.ShomareKhabar}
          className={`${styles.item} ${selected?.ShomareKhabar === item.ShomareKhabar ? styles.active : ""}`}
          onClick={() => void selectNews(item)}>
          <span className={styles.itemTop}><strong>خبر {numberFa(item.ShomareKhabar)}</strong>
            <span className={item.IsBlocked ? styles.flag : styles.normal}>{item.IsBlocked ? "نیازمند رسیدگی" : "عادی"}</span></span>
          <span className={styles.newsTitle}>{item.OnvanKhabar || "بدون عنوان"}</span>
          <small>{item.OldOwnerName || `کاربر ${numberFa(item.OldUserId)}`} · {item.OldPostName}</small>
          <small>{item.ReassignmentReason}</small>
        </button>)}
      </div>
      <div className={styles.editor}>
        {!selected ? <p className={styles.empty}>برای انتخاب مسئول جایگزین، خبر موردنظر را از فهرست انتخاب کنید.</p> : <>
          <h3>بازتخصیص خبر {numberFa(selected.ShomareKhabar)}</h3>
          <p className={styles.current}>مسئول فعلی: <strong>{selected.OldOwnerName || numberFa(selected.OldUserId)}</strong></p>
          {loadingCandidates ? <p>در حال دریافت کاربران مجاز...</p> : <>
            <label className={styles.field}>مسئول جایگزین
              <select value={target} onChange={e => setTarget(e.target.value)}>
                <option value="">انتخاب کاربر مجاز...</option>
                {candidates.map(u => <option key={u.UserId} value={u.UserId}>
                  {u.FullName || `کاربر ${numberFa(u.UserId)}`} — {u.OnvanPost}
                </option>)}
              </select>
            </label>
            {candidates.length === 0 ? <p className={styles.warning}>کاربر فعال و هم‌سطحِ دارای مجوز در این محل یافت نشد. ابتدا تخصیص کاربر را اصلاح کنید.</p> : null}
            <label className={styles.field}>علت بازتخصیص (اجباری)
              <textarea rows={3} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)}
                placeholder="دلیل انتقال خبر به مسئول جایگزین را بنویسید..." />
            </label>
            <button type="button" className={styles.primary} disabled={!target || reason.trim().length < 5 || saving}
              onClick={() => void reassign()}>{saving ? "در حال انتقال..." : "تأیید و ثبت بازتخصیص"}</button>
          </>}
          {history.length > 0 ? <div className={styles.history}><h4>سوابق بازتخصیص این خبر</h4>
            {history.map((r, i) => <div key={`${r.CreatedAtJalali}-${i}`} className={styles.historyItem}>
              <strong>{r.OldName || numberFa(r.OldUserId)} ← {r.NewName || numberFa(r.NewUserId)}</strong>
              <small>{r.CreatedAtJalali} · مدیر: {r.AdminName || numberFa(r.AdminUserId)}</small>
              <span>{r.Reason}</span>
            </div>)}
          </div> : null}
        </>}
      </div>
    </div>
  </section>;
}
