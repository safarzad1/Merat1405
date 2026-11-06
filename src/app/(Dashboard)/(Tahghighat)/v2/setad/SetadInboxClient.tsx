"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { AppNotice, EmptyMessage, workflowStyles as u } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";
import DirectorReviewDossierReadonly from "@/app/(Dashboard)/(Tahghighat)/v2/components/DirectorReviewDossierReadonly";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import { meratConfirm } from "@/component/MeratFeedback/feedback";
import s from "../raeesdaftar/DirectorReview.module.css";
import own from "./SetadInbox.module.css";

const PAGE_SIZE = 20;
type Tab = "pending" | "working" | "decided" | "new";
type Action = "SETAD_NOTE" | "SETAD_APPROVE" | "RETURN_PROVINCE";
const labels: Record<Tab, string> = {
  pending: "پیشخوان ستاد",
  working: "در دست اقدام کارشناسان استان",
  decided: "اعلام‌نظرهای ستاد",
  new: "ارجاع اولیه به استان",
};
const str = (v: unknown): string => v == null || String(v).trim() === "" ? "—" : String(v);
const num = (v: unknown): number => Number(v ?? 0) || 0;
const fa = (n: number): string => n.toLocaleString("fa-IR");
const prettyDate = (raw: unknown) => {
  if (!raw) return "—";
  const stamp = String(raw);
  const parsed = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(stamp) ? stamp : `${stamp}Z`);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran"
  }).format(parsed);
};
const listUrl = (tab: Exclude<Tab, "new">, page: number, pageSize: number) =>
  tab === "pending" ? `/Api/TahghighV2/SetadInbox?page=${page}&pageSize=${pageSize}` :
  `/Api/TahghighV2/SetadOverview?mode=${tab === "working" ? "WORKING" : "DECIDED"}&page=${page}&pageSize=${pageSize}`;
const totalFor = (rows: V2Row[]) => num(rows[0]?.TotalCount);
const actionLabel = (code: unknown) => code === "SETAD_APPROVE" ? "تأیید نهایی" :
  code === "RETURN_PROVINCE" ? "برگشت به کارشناس استان" : "ثبت نظر کارشناسی";

export default function SetadInboxClient() {
  const [tab, setTab] = useState<Tab>("pending");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<V2Row[]>([]);
  const [counts, setCounts] = useState({ pending: 0, working: 0, decided: 0 });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<V2Row | null>(null);
  const [events, setEvents] = useState<V2Row[]>([]);
  const [action, setAction] = useState<Action>("SETAD_NOTE");
  const [description, setDescription] = useState("");
  const [showDossier, setShowDossier] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [initial, setInitial] = useState({ codeEntekhabat: "", codeHozeh: "", shomarehParvandeh: "", ostanCityId: "", description: "" });
  const fetchToken = useRef(0);
  const detailToken = useRef(0);
  const confirming = useRef(false);

  const load = useCallback(async () => {
    if (tab === "new") return;
    const token = ++fetchToken.current;
    setLoading(true);
    try {
      const data = await meratV2Request(listUrl(tab, page, PAGE_SIZE));
      if (fetchToken.current !== token) return;
      setRows(data);
      if (page === 1 || data.length > 0) setCounts(old => ({ ...old, [tab]: totalFor(data) }));
    } finally { if (fetchToken.current === token) setLoading(false); }
  }, [page, tab]);

  const loadCounts = useCallback(async () => {
    const keys = ["pending", "working", "decided"] as const;
    const results = await Promise.all(keys.map(async key => {
      const data = await meratV2Request(listUrl(key, 1, 1));
      return [key, totalFor(data)] as const;
    }));
    setCounts(Object.fromEntries(results) as typeof counts);
  }, []);
  useEffect(() => { void loadCounts().catch(() => {}); }, [loadCounts]);
  useEffect(() => {
    let active = true;
    void load().then(() => { if (active) setError(""); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "خطای دریافت کارتابل ستاد"); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (selected === null) { setDetail(null); setEvents([]); return; }
    let active = true;
    const token = ++detailToken.current;
    setDetail(null); setEvents([]); setDetailsLoading(true);
    const reqs: Promise<V2Row[]>[] = [
      meratV2Request(`/Api/TahghighV2/SetadTimeline?referralId=${selected}`),
    ];
    if (tab === "pending") reqs.push(meratV2Request(`/Api/TahghighV2/SetadReferralDetail?referralId=${selected}`));
    void Promise.all(reqs)
      .then(([history, details]) => {
        if (!active || detailToken.current !== token) return;
        setEvents(history);
        setDetail(details?.[0] ?? null);
      })
      .catch(e => { if (active && detailToken.current === token) setError(e instanceof Error ? e.message : "دریافت سوابق پرونده ناموفق بود."); })
      .finally(() => { if (active && detailToken.current === token) setDetailsLoading(false); });
    return () => { active = false; };
  }, [selected, tab]);

  const filtered = useMemo(() => {
    const normalized = (val: unknown) => String(val ?? "").toLocaleLowerCase("fa-IR")
      .replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));
    const term = normalized(search.trim());
    return !term ? rows : rows.filter(r =>
      [r.ReferralId, r.ShomarehParvandeh, r.ProvinceName, r.StateTitle, r.ExpertFullName, r.ActorFullName]
        .some(v => normalized(v).includes(term)));
  }, [rows, search]);
  const total = page === 1 || rows.length > 0 ? totalFor(rows) : counts[tab === "new" ? "pending" : tab];
  const pendingResearch = num(detail?.PendingChildReferrals) > 0 || num(detail?.PendingAssignments) > 0;
  const validOrigin = detail?.ProvinceSubmitAction === "NO_RESEARCH"
    ? typeof detail.NoResearchReason === "string" && detail.NoResearchReason.trim().length > 0
    : detail?.ProvinceSubmitAction === "SUBMIT_DIRECTOR"
      && typeof detail.SummaryText === "string" && detail.SummaryText.trim().length > 0;
  const ready = !busy && !detailsLoading && !!detail && detail.StateCode === "SETAD_REVIEW";
  const canAct = ready && (action === "SETAD_APPROVE" ? !pendingResearch && validOrigin : description.trim().length > 0);

  function switchTab(next: Tab) {
    fetchToken.current++; detailToken.current++;
    setTab(next); setPage(1); setRows([]); setSelected(null); setDetail(null); setEvents([]);
    setSearch(""); setShowDossier(false); setError(""); setMessage("");
  }
  function choose(id: number) {
    if (selected === id) { setSelected(null); return; }
    setSelected(id); setAction("SETAD_NOTE"); setDescription(""); setError(""); setMessage(""); setShowDossier(false);
  }
  async function perform() {
    if (!selected || !canAct || confirming.current) return;
    confirming.current = true;
    try {
      if (action !== "SETAD_NOTE") {
        const question = action === "RETURN_PROVINCE"
          ? `پرونده شماره ${str(detail?.ShomarehParvandeh)} با دلیل ثبت‌شده به کارشناس استان برگشت داده شود؟`
          : `پرونده شماره ${str(detail?.ShomarehParvandeh)} تأیید نهایی شود؟`;
        const ok = await meratConfirm(question, {
          title: action === "RETURN_PROVINCE" ? "برگشت پرونده برای اصلاح" : "تأیید نهایی پرونده در ستاد",
          type: action === "RETURN_PROVINCE" ? "warning" : "success",
          confirmText: action === "RETURN_PROVINCE" ? "ثبت برگشت با دلیل" : "تأیید نهایی",
          cancelText: "انصراف",
        });
        if (!ok) return;
      }
      setBusy(true); setError(""); setMessage("");
      await meratV2Request("/Api/TahghighV2/SetadAction", {
        referralId: selected, actionCode: action, description: description.trim()
      });
      if (action === "SETAD_NOTE") {
        setMessage("نظر کارشناسی ثبت شد و پرونده در پیشخوان ستاد باقی ماند.");
        setEvents(await meratV2Request(`/Api/TahghighV2/SetadTimeline?referralId=${selected}`));
        setDescription("");
      } else {
        setMessage(action === "RETURN_PROVINCE" ? "پرونده با دلیل به پیشخوان کارشناس استان برگشت داده شد." : "پرونده در ستاد تأیید نهایی شد.");
        setSelected(null); setDetail(null); setEvents([]);
      }
      await load(); await loadCounts().catch(() => {});
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت تصمیم ستاد انجام نشد."); }
    finally { setBusy(false); confirming.current = false; }
  }

  async function createInitial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await meratV2Request("/Api/TahghighV2/Initial", {
        codeEntekhabat: Number(initial.codeEntekhabat), codeHozeh: Number(initial.codeHozeh),
        shomarehParvandeh: Number(initial.shomarehParvandeh), ostanCityId: Number(initial.ostanCityId),
        description: initial.description,
      });
      setMessage(`ارجاع اولیه شماره ${str(result[0]?.ReferralId)} ثبت شد.`);
      setInitial({ codeEntekhabat: "", codeHozeh: "", shomarehParvandeh: "", ostanCityId: "", description: "" });
    } catch (e) { setError(e instanceof Error ? e.message : "ثبت ارجاع اولیه انجام نشد."); }
    finally { setBusy(false); }
  }

  return <main className={`${u.workspace} ${s.page} ${own.setad}`} dir="rtl">
    <header className={s.compactHeader}>
      <div className={s.headerTitle}><h1>کارتابل تحقیقات ستاد</h1></div>
      <div className={s.quickStats} aria-label="آمار تحقیقات ستاد">
        <div><span>پیشخوان ستاد</span><strong>{fa(counts.pending)}</strong></div>
        <div><span>در دست اقدام کارشناسان</span><strong>{fa(counts.working)}</strong></div>
        <div><span>اعلام‌نظرهای ستاد</span><strong>{fa(counts.decided)}</strong></div>
      </div>
    </header>
    {error && <AppNotice kind="error">{error}</AppNotice>}
    {message && <AppNotice kind="success">{message}</AppNotice>}
    <nav className={s.sectionTabs} aria-label="بخش‌های تحقیقات ستاد">
      {(["pending", "working", "decided", "new"] as Tab[]).map(key =>
        <button type="button" key={key} onClick={() => switchTab(key)}
          className={`${s.sectionTab} ${tab === key ? s.activeTab : ""}`}
          aria-current={tab === key ? "page" : undefined}>
          {labels[key]} {key !== "new" && <span>{fa(counts[key])}</span>}
        </button>)}
    </nav>
    {tab === "new" ? <section className={own.newForm}>
      <h2>ایجاد ارجاع اولیه</h2>
      <form onSubmit={e => void createInitial(e)}>
        <div className={own.fieldGrid}>{([
          ["codeEntekhabat", "کد انتخابات"], ["codeHozeh", "کد حوزه"],
          ["shomarehParvandeh", "شماره پرونده"], ["ostanCityId", "کد استان مقصد"]
        ] as const).map(([field, title]) => <label key={field}>{title}
          <input required type="number" min={1} value={initial[field]}
            onChange={e => setInitial(prev => ({ ...prev, [field]: e.target.value }))}/>
        </label>)}</div>
        <label>شرح ارجاع<textarea required maxLength={6000} rows={3} value={initial.description}
          onChange={e => setInitial(prev => ({ ...prev, description: e.target.value }))}/></label>
        <button type="submit" className={s.selectButton} disabled={busy || !initial.description.trim()}>ثبت و ارسال به استان</button>
      </form>
    </section> : <>
      <section className={s.inboxPanel} aria-label="فهرست تحقیقات ستاد">
        <div className={s.inboxToolbar}>
          <div className={s.inboxTitle}><span className={s.listIcon}>☷</span><h2>{labels[tab]}</h2><span className={s.countPill}>{fa(total)}</span></div>
          <div className={s.toolbarTools}>
            <label className={s.searchBox}><span className={s.srOnly}>جستجو در پرونده‌ها</span>
              <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="شماره پرونده، استان یا نام کارشناس…" />
              <span aria-hidden="true">⌕</span></label>
            <button className={s.refreshButton} type="button" disabled={loading} onClick={() => void load().catch(e => setError(String(e)))}>بازخوانی</button>
          </div>
        </div>
        <div className={s.tableWrap}><table className={s.table}>
          <thead><tr><th>ردیف</th><th>ارجاع</th><th>شماره پرونده</th><th>استان</th><th>حوزه</th>
            {tab === "working" ? <><th>کارشناس پیگیر</th><th>وضعیت رسیدگی</th></> :
             tab === "decided" ? <><th>نوع اقدام</th><th>اقدام‌کننده</th><th>تاریخ</th></> : <th>وضعیت</th>}
            <th>مشاهده</th>
          </tr></thead>
          <tbody>{filtered.map((row, i) => {
            const id = num(row.ReferralId);
            const dossierId = num(row.RootReferralId) || id;
            return <tr key={`${id}-${i}`} className={selected === dossierId ? s.selectedRow : ""}>
              <td>{fa((page-1)*PAGE_SIZE+i+1)}</td><td>{fa(id)}</td>
              <td>{str(row.ShomarehParvandeh)}</td><td>{str(row.ProvinceName ?? row.OstanCityId)}</td>
              <td>{str(row.CodeHozeh)}</td>
              {tab === "working" ? <><td>{str(row.ExpertFullName)}</td><td>{str(row.StateTitle)}</td></> :
                tab === "decided" ? <><td><span className={row.DecisionActionCode === "RETURN_PROVINCE" ? own.returnStatus : own.successStatus}>{actionLabel(row.DecisionActionCode)}</span></td>
                  <td>{str(row.ActorFullName)}</td><td>{prettyDate(row.DecisionAtUtc)}</td></> :
                <td><span className={s.readyBadge}>منتظر نظر ستاد</span></td>}
              <td><button type="button" className={s.selectButton} onClick={() => choose(dossierId)}>
                {selected === dossierId ? "بستن" : "جزئیات و سوابق"}</button></td>
            </tr>;
          })}</tbody>
        </table>
        {!loading && rows.length===0 && <EmptyMessage title="در این بخش پرونده‌ای وجود ندارد" />}
        {!loading && rows.length>0 && filtered.length===0 && <p className={own.emptySearch}>موردی مطابق جستجو یافت نشد.</p>}
        </div>
        <div className={s.listFooter}><span>نمایش {fa(filtered.length)} ردیف از {fa(total)} مورد</span>
          <div className={s.paging}>
            <button type="button" disabled={page===1 || loading} onClick={() => {setSelected(null);setPage(n => n-1);}}>قبلی</button>
            <span>صفحه {fa(page)}</span>
            <button type="button" disabled={page*PAGE_SIZE>=total || loading} onClick={() => {setSelected(null);setPage(n => n+1);}}>بعدی</button>
          </div>
        </div>
      </section>
      {selected !== null && <section className={s.review}>
        <header className={s.reviewHeader}><div><span>ارجاع {fa(selected)}</span><h2>سوابق اقدامات و بررسی پرونده</h2></div>
          <button className={s.closeReview} type="button" onClick={() => setSelected(null)}>بستن جزئیات ×</button></header>
        {detailsLoading ? <p role="status">در حال بارگذاری سوابق…</p> : <>
          {tab === "pending" && detail && <div className={s.infoLine}>
            <div className={s.infoItem}><span>شماره پرونده:</span><strong>{str(detail.ShomarehParvandeh)}</strong></div>
            <div className={s.infoItem}><span>وضعیت:</span><strong>{str(detail.StateTitle)}</strong></div>
            <div className={s.infoItem}><span>ارجاعات باز:</span><strong>{fa(num(detail.PendingChildReferrals))}</strong></div>
            <div className={s.infoItem}><span>محققان ناتمام:</span><strong>{fa(num(detail.PendingAssignments))}</strong></div>
          </div>}
          <div className={s.summaryPanel}>
            <div className={s.summaryHeader}><h3>تمام جمع‌بندی‌ها، کاربرگ‌ها و اسناد تحقیقات</h3><span className={s.readOnly}>فقط‌خواندنی</span></div>
            {tab === "pending" && detail && <div className={s.summaryPreview}>
              {str(detail.ProvinceSubmitAction === "NO_RESEARCH" ? detail.NoResearchReason : detail.SummaryText)}
            </div>}
            <button className={s.openDossier} type="button" onClick={() => setShowDossier(true)}>مشاهده فرم‌های رسمی و تمام اسناد</button>
          </div>
          <div className={own.historyBox}>
            <div className={own.historyHead}><h3>تاریخچه اقدامات پرونده</h3><span>{fa(events.length)} اقدام ثبت‌شده</span></div>
            <div className={own.historyList}>{events.length === 0 ? <p>اقدامی برای این پرونده ثبت نشده است.</p> : events.map((ev, index) =>
              <div className={own.historyItem} key={`${str(ev.LogType)}-${str(ev.LogId)}-${index}`}>
                <div className={own.historyTop}><strong>{str(ev.ActionTitle)}</strong><time>{prettyDate(ev.OccurredAtUtc)}</time></div>
                <div className={own.historyMeta}><span>{str(ev.ActorFullName)}</span><span>·</span><span>{str(ev.DestinationName)}</span></div>
                {typeof ev.ActionDescription === "string" && ev.ActionDescription.trim() &&
                  <p className={own.historyDescription}>{ev.ActionDescription}</p>}
              </div>)}</div>
          </div>
          {tab === "pending" && detail && <div className={s.decision}>
            <h3>ثبت نظر یا تصمیم ستاد</h3>
            {pendingResearch && <p className={own.warning}>برای تأیید نهایی، همه تحقیقات و ارجاعات باید تکمیل شوند. ثبت نظر یا برگشت برای اصلاح امکان‌پذیر است.</p>}
            <div className={s.decisionOptions} role="group" aria-label="نوع تصمیم ستاد">
              <button type="button" className={action === "SETAD_NOTE" ? own.activeNote : ""} aria-pressed={action === "SETAD_NOTE"}
                onClick={() => { setAction("SETAD_NOTE");setDescription(""); }}>ثبت نظر بدون بستن پرونده</button>
              <button type="button" className={action === "SETAD_APPROVE" ? s.activeApprove : ""} aria-pressed={action === "SETAD_APPROVE"}
                onClick={() => { setAction("SETAD_APPROVE");setDescription(""); }}>تأیید نهایی</button>
              <button type="button" className={action === "RETURN_PROVINCE" ? s.activeReturn : ""} aria-pressed={action === "RETURN_PROVINCE"}
                onClick={() => { setAction("RETURN_PROVINCE");setDescription(""); }}>برگشت به کارشناس استان</button>
            </div>
            <label htmlFor="setad-action-description">{action === "SETAD_APPROVE" ? "توضیحات تأیید (اختیاری)" :
              action === "RETURN_PROVINCE" ? "دلیل برگشت (الزامی)" : "متن نظر کارشناسی (الزامی)"}</label>
            <textarea id="setad-action-description" rows={3} maxLength={6000} value={description}
              placeholder={action === "RETURN_PROVINCE" ? "دلیل برگشت و موارد قابل اصلاح را بنویسید…" : "نظر خود را درباره پرونده ثبت کنید…"}
              onChange={e => setDescription(e.target.value)} />
            <div className={s.actionBar}><button className={action === "RETURN_PROVINCE" ? s.returnButton : s.approveButton}
              type="button" disabled={!canAct} onClick={() => void perform()}>
              {busy ? "در حال ثبت…" : action === "RETURN_PROVINCE" ? "ثبت دلیل و برگشت به کارشناس" :
                action === "SETAD_APPROVE" ? "تأیید نهایی پرونده" : "ثبت نظر کارشناسی"}
            </button></div>
          </div>}
        </>}
      </section>}
      {showDossier && selected !== null && <DirectorReviewDossierReadonly viewer="setad"
        referralId={selected} onClose={() => setShowDossier(false)} />}
    </>}
  </main>;
}
