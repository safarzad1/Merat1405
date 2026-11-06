"use client";
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useId, useState } from "react";
import s from "./ProvinceInvestigatorEvidence.module.css";

type Scope = "OSTAN" | "HOZE" | "COUNTY";
type Doc = {
  AttachmentId: string;
  OriginalFileName: string;
  MimeType: string;
  AttachmentKind?: string;
  AttachmentDescription?: string | null;
};
type Reply = {ok: boolean; data?: Doc[]; message?: string};
const source = (scope: Scope) => scope === "OSTAN" ? "ProvinceInvestigatorDocuments" : "DocumentAttachments";
const fileEndpoint = (scope: Scope) => scope === "OSTAN" ? "ProvinceInvestigatorDocumentFile" : "DocumentAttachmentFile";
const pageNumber = (doc: Doc) => doc.AttachmentDescription?.startsWith("[WS-SUMMARY-2]") ? 2 : 1;

function UploadIcon() {
  return <svg width="43" height="43" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M14 32H10a7 7 0 0 1-1-14 13 13 0 0 1 25-2 8 8 0 0 1 3 16h-3"/>
    <path d="M24 37V21m-7 7 7-7 7 7"/>
  </svg>;
}

export default function WorksheetSummaryDocuments({worksheetId, scope, readOnly, onChange}: {
  worksheetId: number; scope: Scope; readOnly: boolean; onChange?: () => void;
}) {
  const controlId = useId();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [busy, setBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<Doc | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [dragPage, setDragPage] = useState<1 | 2 | null>(null);
  const [busyPage, setBusyPage] = useState<1 | 2 | null>(null);
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const url = `/Api/TahghighV2/${source(scope)}?targetEntity=RESEARCH_WORKSHEET&targetRecordId=${worksheetId}`;
    const response = await fetch(url, {credentials: "same-origin", cache: "no-store", signal});
    const result = await response.json() as Reply;
    if (!response.ok || !result.ok) throw new Error(result.message || "خواندن پیوست‌های جمع‌بندی ناموفق بود.");
    setDocs((result.data || []).filter(d =>
      d.AttachmentKind === "WORKSHEET" && /^\[WS-SUMMARY-[12]\]/.test(d.AttachmentDescription || "")));
  }, [scope, worksheetId]);
  useEffect(() => {
    const abort = new AbortController();
    setDocs([]); setLoading(true); setError(""); setPendingRemove(null);
    void refresh(abort.signal).catch(e => {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : "خطا در دریافت اسناد");
    }).finally(() => {if (!abort.signal.aborted) setLoading(false);});
    return () => abort.abort();
  }, [refresh]);

  const upload = async (file: File | null, page: 1 | 2, oldDoc?: Doc) => {
    if (!file || busy || loading || readOnly) return;
    setError("");
    const ext = file.name.split(".").pop() || "";
    if (file.size < 1 || file.size > 3 * 1024 * 1024 || !/^(png|jpe?g|webp)$/i.test(ext) ||
      (file.type && !["image/png", "image/jpeg", "image/webp"].includes(file.type))) {
      setError("فقط تصویر PNG، JPG یا WEBP تا ۳ مگابایت پذیرفته می‌شود.");
      return;
    }
    setBusy(true); setBusyPage(page);
    try {
      const form = new FormData();
      form.set("worksheetId", String(worksheetId));
      form.set("page", String(page));
      form.set("file", file);
      if (oldDoc) form.set("expectedAttachmentId", oldDoc.AttachmentId);
      const response = await fetch("/Api/TahghighV2/WorksheetSummaryDocuments", {
        method: "POST", body: form, credentials: "same-origin"
      });
      const result = await response.json() as Reply;
      if (!response.ok || !result.ok) throw new Error(result.message || "ثبت تصویر جمع‌بندی ناموفق بود.");
      await refresh(); onChange?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ثبت تصویر انجام نشد.");
    } finally { setBusy(false); setBusyPage(null); setDragPage(null); }
  };

  const remove = async (doc: Doc) => {
    if (busy || readOnly) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(
        `/Api/TahghighV2/${fileEndpoint(scope)}?attachmentId=${encodeURIComponent(doc.AttachmentId)}`,
        {method: "DELETE", headers: {"Content-Type": "application/json"}, body: "{}", credentials: "same-origin"}
      );
      const result = await response.json() as Reply;
      if (!response.ok || !result.ok) throw new Error(result.message || "حذف سند انجام نشد.");
      await refresh(); onChange?.(); setPendingRemove(null);
    } catch (e) {setError(e instanceof Error ? e.message : "حذف انجام نشد.");}
    finally {setBusy(false);}
  };

  const fileUrl = (doc: Doc) =>
    `/Api/TahghighV2/${fileEndpoint(scope)}?attachmentId=${encodeURIComponent(doc.AttachmentId)}`;

  // The same gallery is used for province, main constituency and subsidiary county.
  return <section className={`${s.worksheetSummaryDocs} worksheetSummaryDocs`} aria-label="اسناد جمع‌بندی همین کاربرگ">
    <div className={s.worksheetSummaryHead}>
      <strong>اسناد جمع‌بندی همین کاربرگ</strong>
      <small>حداکثر دو تصویر مستقل از جمع‌بندی نهایی محقق</small>
    </div>
    {error && <div className={s.worksheetSummaryAlert} role="alert">
      <span>{error}</span>
      <button type="button" disabled={busy || loading} onClick={() => {setError(""); void refresh().catch(e => setError(e instanceof Error ? e.message : "خطا در دریافت اسناد"));}}>تلاش مجدد</button>
    </div>}
    <div className={s.worksheetSummarySlots}>
      {([1, 2] as const).map(page => {
        const doc = docs.find(d => pageNumber(d) === page);
        const label = page === 1 ? "صفحه اول" : "صفحه دوم";
        const inputId = `${controlId}-worksheet-summary-${page}`;
        return <div key={page} className={s.worksheetSummarySlot}>
          <div className={s.worksheetSummarySlotTitle}><b>{label}</b><span>برگه A4</span></div>
          <div className={`${s.worksheetSummaryPaper} ${dragPage === page ? s.worksheetSummaryPaperDragging : ""} ${busyPage === page ? s.worksheetSummaryPaperBusy : ""}`}>
            {doc ? <>
              {doc.MimeType.startsWith("image/") && <img className={s.worksheetSummaryPaperImage}
                src={fileUrl(doc)} alt={`پیش‌نمایش جمع‌بندی کاربرگ، ${label}`} loading="lazy"/>}
              <div className={s.worksheetSummaryPaperSaved} aria-label={`تصویر ${label} ثبت شده است`}>
                <span aria-hidden="true">✓</span> تصویر ثبت‌شده
              </div>
            </> : readOnly ? <div className={s.worksheetSummaryEmptyReadonly}>
              <UploadIcon/><span>{loading ? "در حال بررسی…" : "سندی برای این صفحه ثبت نشده است"}</span>
            </div> : <label htmlFor={inputId} className={s.worksheetSummaryUploadArea}
              onDragOver={event => {event.preventDefault(); if (!busy && !loading) setDragPage(page);}}
              onDragLeave={event => {event.preventDefault(); setDragPage(null);}}
              onDrop={event => {event.preventDefault(); setDragPage(null); if (!busy && !loading) void upload(event.dataTransfer.files[0] || null, page);}}>
              <span className={s.worksheetSummaryUploadSymbol}><UploadIcon/></span>
              <strong>{loading ? "در حال بررسی…" : busyPage === page ? "در حال بارگذاری…" : `بارگذاری ${label}`}</strong>
              <small>برای انتخاب تصویر کلیک کنید یا فایل را اینجا رها کنید</small>
              <em>PNG، JPG یا WEBP · حداکثر ۳ مگابایت</em>
              <input id={inputId} type="file" accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
                aria-label={`بارگذاری تصویر جمع‌بندی کاربرگ، ${label}`} disabled={busy || loading}
                onChange={event => {
                  const file = event.currentTarget.files?.[0] || null;
                  event.currentTarget.value = "";
                  void upload(file, page);
                }}/>
            </label>}
          </div>
          {doc && <div className={s.worksheetSummaryPageActions}>
            <a href={fileUrl(doc)} target="_blank" rel="noopener noreferrer" title={`مشاهده تصویر ${label}`}>مشاهده</a>
            {!readOnly && <>
              <label className={s.worksheetSummaryReplace}>
                جایگزینی
                <input type="file" accept="image/png,image/jpeg,image/webp,.jpg,.jpeg,.png,.webp"
                  aria-label={`جایگزینی تصویر جمع‌بندی کاربرگ، ${label}`} disabled={busy || loading}
                  onChange={event => {
                    const file = event.currentTarget.files?.[0] || null;
                    event.currentTarget.value = "";
                    void upload(file, page, doc);
                  }}/>
              </label>
              <button type="button" className={s.worksheetSummaryDelete} disabled={busy}
                onClick={() => setPendingRemove(doc)}>حذف</button>
            </>}
          </div>}
          {busyPage === page && <span className={s.worksheetSummaryUploading} role="status">در حال ثبت تصویر…</span>}
        </div>;
      })}
    </div>
    {pendingRemove && <div className={s.worksheetSummaryConfirm} role="alertdialog" aria-label="تأیید حذف تصویر جمع‌بندی کاربرگ">
      <b>حذف تصویر جمع‌بندی همین کاربرگ</b>
      <p>آیا از حذف منطقی این تصویر اطمینان دارید؟ سابقه حذف محفوظ است.</p>
      <div>
        <button type="button" disabled={busy} onClick={() => setPendingRemove(null)}>انصراف</button>
        <button type="button" disabled={busy} onClick={() => void remove(pendingRemove)}>تأیید حذف</button>
      </div>
    </div>}
  </section>;
}
