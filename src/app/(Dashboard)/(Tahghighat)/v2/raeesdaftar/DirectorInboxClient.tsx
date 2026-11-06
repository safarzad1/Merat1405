"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EmptyMessage, AppNotice, workflowStyles as u } from "@/app/(Dashboard)/(Tahghighat)/v2/components/MeratWorkflowUI";
import DirectorReviewDossierReadonly from "@/app/(Dashboard)/(Tahghighat)/v2/components/DirectorReviewDossierReadonly";
import { meratV2Request, type V2Row } from "@/app/lib/meratV2/client";
import { meratConfirm } from "@/component/MeratFeedback/feedback";
import s from "./DirectorReview.module.css";

const PAGE_SIZE = 20;
const value = (v: unknown) => v == null || String(v).trim() === "" ? "—" : String(v);
const fa = (n: number) => n.toLocaleString("fa-IR");
type Decision = "DIRECTOR_APPROVE" | "RETURN_PROVINCE";
type DirectorList = "pending" | "working" | "decided";
const listLabels: Record<DirectorList, string> = {
  pending: "در انتظار بررسی من",
  working: "در دست اقدام کارشناسان",
  decided: "اعلام‌نظر شده‌ها",
};
const modeUrl = (mode: DirectorList, page: number, pageSize: number) => mode === "pending"
  ? `/Api/TahghighV2/DirectorInbox?page=${page}&pageSize=${pageSize}`
  : `/Api/TahghighV2/DirectorOverview?mode=${mode === "working" ? "WORKING" : "DECIDED"}&page=${page}&pageSize=${pageSize}`;
const totalFor = (rows: V2Row[]) => Number(rows[0]?.TotalCount || 0);
const persianDateTime = (raw: unknown) => {
  if (!raw) return "—";
  const iso = String(raw);
  const parsed = new Date(/(?:Z|[+-]\d\d:\d\d)$/.test(iso) ? iso : `${iso}Z`);
  return Number.isNaN(parsed.getTime()) ? "—" : new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tehran"
  }).format(parsed);
};

export default function DirectorV2Inbox() {
  const [rows, setRows] = useState<V2Row[]>([]);
  const [listMode, setListMode] = useState<DirectorList>("pending");
  const [counts, setCounts] = useState<Record<DirectorList, number>>({pending:0,working:0,decided:0});
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [detail, setDetail] = useState<V2Row | null>(null);
  const [decision, setDecision] = useState<Decision>("DIRECTOR_APPROVE");
  const [description, setDescription] = useState("");
  const [showDossier, setShowDossier] = useState(false);
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [listBusy, setListBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const requestToken = useRef(0);
  const approvalConfirmPending = useRef(false);

  const load = useCallback(async () => {
    const token = ++requestToken.current;
    setListBusy(true);
    try {
      const result = await meratV2Request(modeUrl(listMode,page,PAGE_SIZE));
      if (requestToken.current !== token) return;
      setRows(result);
      if (page === 1 || result.length) setCounts(prev => ({...prev, [listMode]: totalFor(result)}));
    } finally { if (requestToken.current === token) setListBusy(false); }
  }, [page,listMode]);

  const loadCounts = useCallback(async () => {
    const views: DirectorList[] = ["pending","working","decided"];
    const results = await Promise.all(views.map(async mode => {
      const result = await meratV2Request(modeUrl(mode,1,1));
      return [mode, totalFor(result)] as const;
    }));
    setCounts(Object.fromEntries(results) as Record<DirectorList,number>);
  }, []);

  useEffect(() => {
    void loadCounts().catch(() => { /* each list shows its own API errors when opened */ });
  }, [loadCounts]);

  useEffect(() => {
    let active = true;
    void load().then(() => { if (active) setError(""); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "خطای دریافت کارتابل رئیس دفتر"); });
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (selected == null) { setDetail(null); return; }
    let active = true;
    setDetail(null); setDetailBusy(true);
    void meratV2Request(`/Api/TahghighV2/ReferralDetail?referralId=${selected}`)
      .then(result => { if (active) setDetail(result[0] || null); })
      .catch(e => { if (active) setError(e instanceof Error ? e.message : "خطای دریافت جزئیات پرونده"); })
      .finally(() => { if (active) setDetailBusy(false); });
    return () => { active = false; };
  }, [selected]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fa-IR").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)));
    if (!query) return rows;
    return rows.filter(row => [row.ReferralId, row.ShomarehParvandeh, row.CodeHozeh, row.StateTitle, row.ExpertFullName, row.DecisionReason]
      .some(entry => String(entry ?? "").toLocaleLowerCase("fa-IR").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).includes(query)));
  }, [rows, search]);
  const totalRows = page === 1 || rows.length ? totalFor(rows) : counts[listMode];
  const hasPending = Number(detail?.PendingChildReferrals || 0) > 0 || Number(detail?.PendingAssignments || 0) > 0;
  const isForDirector = detail?.StateCode === "DIRECTOR_REVIEW";
  const canSend = !busy && !detailBusy && !!detail && isForDirector && !hasPending;
  const canReturn = !busy && !detailBusy && !!detail && isForDirector && description.trim().length > 0;

  function switchMode(next: DirectorList) {
    if (listMode === next) return;
    requestToken.current += 1;
    setListMode(next);setPage(1);setSearch("");setSelected(null);setDetail(null);
    setShowDossier(false);setError("");setMessage("");setRows([]);
  }
  function chooseReferral(id: number) {
    setShowDossier(false);setSelected(id);setDecision("DIRECTOR_APPROVE");setDescription("");setError("");setMessage("");
  }
  function changeDecision(next: Decision) {
    setDecision(next);setDescription("");
  }
  async function perform() {
    if (!selected || busy || (decision === "DIRECTOR_APPROVE" ? !canSend : !canReturn)) return;
    setBusy(true);setError("");setMessage("");
    try {
      await meratV2Request("/Api/TahghighV2/DirectorAction", {
        referralId: selected, actionCode: decision, description: description.trim()
      });
      setMessage(decision === "DIRECTOR_APPROVE"
        ? "پرونده پس از تأیید رئیس دفتر برای ستاد ارسال شد."
        : "پرونده با دلیل ثبت‌شده به کارشناس استان بازگردانده شد.");
      setSelected(null);setDetail(null);setDescription("");
      await load();
      await loadCounts().catch(() => {});
    } catch (e) { setError(e instanceof Error ? e.message : "عملیات رئیس دفتر انجام نشد."); }
    finally { setBusy(false); }
  }

  async function handleDecisionClick() {
    if (decision === "RETURN_PROVINCE") {
      await perform();
      return;
    }
    if (!canSend || approvalConfirmPending.current) return;
    approvalConfirmPending.current = true;
    try {
      const approved = await meratConfirm(
        `آیا پرونده شماره ${value(detail?.ShomarehParvandeh)} پس از بررسی نهایی به ستاد ارسال شود؟\nپس از ارسال، پرونده از فهرست «در انتظار بررسی» رئیس دفتر خارج می‌شود.`,
        {
          title: "تأیید نهایی ارسال پرونده به ستاد",
          type: "success",
          confirmText: "تأیید و ارسال به ستاد",
          cancelText: "انصراف",
        },
      );
      if (approved) await perform();
    } finally {
      approvalConfirmPending.current = false;
    }
  }

  return <main dir="rtl" className={`${u.workspace} ${s.page}`}>
    <header className={s.compactHeader}>
      <div className={s.headerTitle}>
        <span className={s.headerEyebrow}><span className={s.headerDot} /> مدیریت تحقیقات / بررسی استان</span>
        <h1>کارتابل رئیس دفتر استان</h1>
      </div>
      <div className={s.quickStats} aria-label="آمار کارتابل">
        <div><span>منتظر بررسی</span><strong>{fa(counts.pending)}</strong></div>
        <div><span>در دست اقدام</span><strong>{fa(counts.working)}</strong></div>
        <div><span>اعلام‌نظر شده</span><strong>{fa(counts.decided)}</strong></div>
      </div>
    </header>

    {error && <AppNotice kind="error">{error}</AppNotice>}
    {message && <AppNotice kind="success">{message}</AppNotice>}
    <nav className={s.sectionTabs} aria-label="دسته‌بندی پرونده‌های رئیس دفتر">
      {(["pending","working","decided"] as DirectorList[]).map(mode =>
        <button key={mode} type="button" onClick={() => switchMode(mode)}
          className={`${s.sectionTab} ${listMode === mode ? s.activeTab : ""}`}
          aria-current={listMode === mode ? "page" : undefined}>
          {listLabels[mode]} <span>{fa(counts[mode])}</span>
        </button>)}
    </nav>
    <section className={s.inboxPanel} aria-label="فهرست پرونده‌های رئیس دفتر">
      <div className={s.inboxToolbar}>
        <div className={s.inboxTitle}><span className={s.listIcon} aria-hidden="true">☷</span>
          <div><h2>{listLabels[listMode]}</h2></div>
          <span className={s.countPill}>{fa(totalRows)}</span>
        </div>
        <div className={s.toolbarTools}>
          <label className={s.searchBox}>
            <span className={s.srOnly}>جستجو در پرونده‌ها</span>
            <input type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی شماره پرونده یا حوزه…" />
            <span aria-hidden="true">⌕</span>
          </label>
          <button type="button" className={s.refreshButton} disabled={listBusy} onClick={() => void load().catch(e => setError(String(e)))}>{listBusy ? "در حال بازخوانی…" : "بازخوانی"}</button>
        </div>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead><tr><th>ردیف</th><th>شماره ارجاع</th><th>شماره پرونده</th><th>حوزه انتخابیه</th>
            {listMode === "working" ? <><th>کارشناس پیگیر</th><th>وضعیت رسیدگی</th><th>آخرین تغییر</th></>
              : listMode === "decided" ? <><th>نظر رئیس دفتر</th><th>تاریخ اعلام نظر</th><th>توضیحات تصمیم</th><th>وضعیت کنونی پرونده</th></>
              : <><th>وضعیت</th><th>عملیات</th></>}
          </tr></thead>
          <tbody>{filteredRows.map((row, index) => {
            const id = Number(row.ReferralId);
            return <tr key={id} className={selected===id?s.selectedRow:""}>
              <td>{fa((page-1)*PAGE_SIZE+index+1)}</td><td>{fa(id)}</td><td>{value(row.ShomarehParvandeh)}</td><td>{value(row.CodeHozeh)}</td>
              {listMode === "working" ? <>
                <td>{value(row.ExpertFullName)}</td>
                <td><span className={s.workingBadge}>{value(row.StateTitle)}</span></td>
                <td>{persianDateTime(row.LastUpdatedAtUtc)}</td>
              </> : listMode === "decided" ? <>
                <td><span className={row.DecisionActionCode === "DIRECTOR_APPROVE" ? s.approvedBadge : s.returnedBadge}>
                  {row.DecisionActionCode === "DIRECTOR_APPROVE" ? "تأیید و ارسال به ستاد" : "برگشت به کارشناس"}
                </span></td>
                <td>{persianDateTime(row.DecisionAtUtc)}</td>
                <td className={s.reasonCell} title={String(row.DecisionReason || "")}>{value(row.DecisionReason)}</td>
                <td>{value(row.StateTitle)}</td>
              </> : <>
                <td><span className={s.readyBadge}>در انتظار بررسی</span></td>
                <td><button type="button" className={s.selectButton} onClick={() => chooseReferral(id)}>
                  {selected === id ? "در حال مشاهده" : "مشاهده پرونده"}<span aria-hidden="true">◀</span></button></td>
              </>}
            </tr>;
          })}</tbody>
        </table>
        {!listBusy && rows.length===0 && <EmptyMessage title={listMode === "pending" ? "پرونده‌ای منتظر بررسی نیست" : listMode === "working" ? "پرونده‌ای در دست اقدام کارشناسان یافت نشد" : "سابقه اعلام نظر ثبت نشده است"} /> }
        {!listBusy && rows.length>0 && filteredRows.length===0 && <p className={s.noSearchResults}>پرونده‌ای مطابق عبارت جستجو پیدا نشد.</p>}
      </div>
      <div className={s.listFooter}>
        <span>نمایش {fa(filteredRows.length)} ردیف از {fa(totalRows)} مورد</span>
        <div className={s.paging}>
          <button type="button" disabled={page === 1 || listBusy} onClick={() => {setPage(p => p - 1);setSelected(null);}}>قبلی</button>
          <span>صفحه {fa(page)}</span>
          <button type="button" disabled={page * PAGE_SIZE >= totalRows || listBusy} onClick={() => {setPage(p => p + 1);setSelected(null);}}>بعدی</button>
        </div>
      </div>
    </section>

    {listMode === "pending" && selected !== null && <section className={s.review}>
      <header className={s.reviewHeader}>
        <div><span>بررسی ارجاع {fa(selected)}</span><h2>بررسی نهایی پرونده استان</h2></div>
        <button type="button" className={s.closeReview} onClick={() => setSelected(null)}>بستن جزئیات ×</button>
      </header>
      {detailBusy ? <p role="status">در حال دریافت اطلاعات پرونده…</p> : detail ? <>
        <div className={s.infoLine} aria-label="مشخصات پرونده">
          <div className={s.infoItem}><span>شماره پرونده:</span><strong>{value(detail.ShomarehParvandeh)}</strong></div>
          <div className={s.infoItem}><span>وضعیت:</span><strong>{value(detail.StateTitle)}</strong></div>
          <div className={s.infoItem}><span>ارجاعات ناتمام:</span><strong>{fa(Number(detail.PendingChildReferrals || 0))}</strong></div>
          <div className={s.infoItem}><span>محققان ناتمام:</span><strong>{fa(Number(detail.PendingAssignments || 0))}</strong></div>
        </div>
        <div className={s.summaryPanel}>
          <div className={s.summaryHeader}>
            <div><h3>فرم رسمی جمع‌بندی استان و سوابق تحقیقات</h3>
              <p>تمام صفحات جمع‌بندی، تصاویر پیوست، گزارش محققان، کاربرگ‌ها و نتایج حوزه اصلی، شهرستان‌های فرعی و استان‌های دیگر.</p></div>
            <span className={s.readOnly}>فقط‌خواندنی</span>
          </div>
          <div className={s.summaryPreview}>{detail.LastActionCode === "NO_RESEARCH"
            ? value(detail.NoResearchReason)
            : value(detail.SummaryText)}</div>
          <button type="button" className={s.openDossier} onClick={() => setShowDossier(true)}>
            مشاهده کامل فرم، تصاویر و اسناد تحقیقات
          </button>
        </div>
        {hasPending && <div className={s.warning} role="alert">ارجاع یا تحقیق ناتمام وجود دارد؛ تأیید برای ستاد مجاز نیست. پرونده را با ذکر دلیل برای اصلاح برگردانید.</div>}
        <div className={s.decision}>
          <h3>تصمیم رئیس دفتر</h3>
          <div className={s.decisionOptions} role="group" aria-label="نوع تصمیم">
            <button type="button" className={decision === "DIRECTOR_APPROVE" ? s.activeApprove : ""}
              aria-pressed={decision === "DIRECTOR_APPROVE"} onClick={() => changeDecision("DIRECTOR_APPROVE")}>تأیید و ارسال به ستاد</button>
            <button type="button" className={decision === "RETURN_PROVINCE" ? s.activeReturn : ""}
              aria-pressed={decision === "RETURN_PROVINCE"} onClick={() => changeDecision("RETURN_PROVINCE")}>برگشت به کارشناس استان</button>
          </div>
          <label htmlFor="director-decision-reason">{decision === "RETURN_PROVINCE" ? "دلیل و توضیحات برگشت (الزامی)" : "توضیحات تأیید و ارسال (اختیاری)"}</label>
          <textarea id="director-decision-reason" rows={3} maxLength={6000}
            placeholder={decision === "RETURN_PROVINCE" ? "موارد لازم برای اصلاح را دقیق بنویسید…" : "در صورت نیاز، توضیحات تأیید پرونده را بنویسید…"}
            value={description} onChange={e => setDescription(e.target.value)} />
          <div className={s.actionBar}>
            <button type="button" disabled={decision === "DIRECTOR_APPROVE" ? !canSend : !canReturn}
              className={decision === "DIRECTOR_APPROVE" ? s.approveButton : s.returnButton}
              onClick={() => void handleDecisionClick()}>
              {busy ? "در حال ثبت تصمیم…" : decision === "DIRECTOR_APPROVE" ? "تأیید نهایی و ارسال به ستاد" : "ثبت دلیل و برگشت به کارشناس"}
            </button>
          </div>
        </div>
      </> : <p>اطلاعات پرونده در دسترس نیست.</p>}
    </section>}
    {listMode === "pending" && showDossier && selected != null && <DirectorReviewDossierReadonly referralId={selected} onClose={() => setShowDossier(false)}/>}
  </main>;
}
