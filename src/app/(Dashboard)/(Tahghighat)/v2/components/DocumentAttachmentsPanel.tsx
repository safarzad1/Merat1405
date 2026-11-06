"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AppNotice, EmptyMessage, workflowStyles as s } from "./MeratWorkflowUI";

type DocumentTarget = "RESEARCH_WORKSHEET" | "RESEARCH_ASSIGNMENT" | "COUNTY_REPLY_EVENT" | "COUNTY_SUMMARY" | "HOZE_SUMMARY" | "PROVINCE_SUMMARY";
type Attachment = {
  AttachmentId: string; OriginalFileName: string; MimeType: string;
  FileSizeBytes: number; CreatedAtUtc: string; AttachmentKind: string; SummaryLevel: string | null;
};
type ApiResult = { ok: boolean; data?: Attachment[]; message?: string };
const MAX_BYTES = 3 * 1024 * 1024;
const ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";
const LABELS: Record<DocumentTarget, string> = {
  RESEARCH_WORKSHEET: "کاربرگ محقق",
  RESEARCH_ASSIGNMENT: "جمع‌بندی محقق",
  COUNTY_REPLY_EVENT: "جمع‌بندی شهرستان (سابق)",
  COUNTY_SUMMARY: "جمع‌بندی شهرستان",
  HOZE_SUMMARY: "جمع‌بندی حوزه اصلی",
  PROVINCE_SUMMARY: "جمع‌بندی استان",
};
const MIME_LABELS: Record<string, string> = {
  "application/pdf": "PDF", "image/jpeg": "JPG", "image/png": "PNG", "image/webp": "WEBP",
};
function humanSize(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} مگابایت` : `${Math.max(1,Math.ceil(bytes/1024))} کیلوبایت`; }

/** Exact persisted target record ID. CaseId/number are resolved on SQL server, never provided by browser. */
export default function DocumentAttachmentsPanel({ targetEntity, targetRecordId, readOnly = false }: {
  targetEntity: DocumentTarget; targetRecordId: number; readOnly?: boolean;
}) {
  const fileId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [items, setItems] = useState<Attachment[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null);
  const validTarget = Number.isSafeInteger(targetRecordId) && targetRecordId > 0;
  const endpoint = `/Api/TahghighV2/DocumentAttachments?targetEntity=${encodeURIComponent(targetEntity)}&targetRecordId=${targetRecordId}`;
  const refresh = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(endpoint, { cache: "no-store", credentials: "same-origin", signal });
    const result = await response.json() as ApiResult;
    if (!response.ok || !result.ok) throw new Error(result.message || "دریافت پیوست‌ها انجام نشد.");
    return result.data ?? [];
  }, [endpoint]);
  useEffect(() => {
    const controller = new AbortController();
    setItems([]); setNotice(null); setFile(null); setDeleteTarget(null); setLoading(true);
    if (!validTarget) { setLoading(false); return () => controller.abort(); }
    refresh(controller.signal)
      .then(data => { if (!controller.signal.aborted) setItems(data); })
      .catch(err => { if (!controller.signal.aborted) setNotice({ kind: "error", text: err instanceof Error ? err.message : "خطای دریافت پیوست‌ها" }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh, validTarget]);
  const reload = async () => setItems(await refresh());
  function selectFile(next: File | null) {
    setNotice(null);
    if (next && (next.size < 1 || next.size > MAX_BYTES)) {
      setFile(null); setNotice({kind: "error", text: "فایل باید حداکثر ۳ مگابایت و غیرخالی باشد."});
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    if (next && !/\.(pdf|jpe?g|png|webp)$/i.test(next.name)) {
      setFile(null); setNotice({kind: "error", text: "فرمت مجاز نیست؛ PDF، JPG، PNG یا WEBP انتخاب کنید."});
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setFile(next);
  }
  async function upload() {
    if (busy || readOnly || !file || !validTarget) return;
    setBusy(true); setNotice(null);
    try {
      const body = new FormData(); body.append("targetEntity", targetEntity);
      body.append("targetRecordId", String(targetRecordId)); body.append("file", file);
      const response = await fetch("/Api/TahghighV2/DocumentAttachments", { method: "POST", body, credentials: "same-origin" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok) throw new Error(result.message || "بارگذاری فایل موفق نبود.");
      await reload(); setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice({kind: "success", text: "پیوست با موفقیت در MeratFilesDB ثبت شد."});
    } catch (err) { setNotice({kind: "error", text: err instanceof Error ? err.message : "خطای بارگذاری"}); }
    finally { setBusy(false); }
  }
  async function remove() {
    if (!deleteTarget || busy || readOnly) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch(`/Api/TahghighV2/DocumentAttachmentFile?attachmentId=${encodeURIComponent(deleteTarget.AttachmentId)}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({}),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok) throw new Error(result.message || "حذف پیوست انجام نشد.");
      await reload(); setDeleteTarget(null);
      setNotice({kind: "success", text: "پیوست به‌صورت منطقی حذف شد و سابقه آن حفظ می‌شود."});
    } catch (err) { setNotice({kind: "error", text: err instanceof Error ? err.message : "خطای حذف پیوست"}); }
    finally { setBusy(false); }
  }
  return <div dir="rtl" className={s.attachments} aria-label={`پیوست‌های ${LABELS[targetEntity]}`}>
    <div className={s.attachHeader}>
      <span className={s.attachIcon} aria-hidden="true">▤</span>
      <div><h3>اسناد {LABELS[targetEntity]}</h3><p>{items.length} فایل ثبت‌شده · {readOnly ? "فقط مشاهده" : "ثبت و مدیریت پیوست"}</p></div>
    </div>
    <div className={s.attachBody}>
      {!validTarget && <AppNotice kind="info">ابتدا سند اصلی را ذخیره کنید تا شناسه معتبر برای پیوست صادر شود.</AppNotice>}
      {!readOnly && validTarget && <div>
        <div className={s.attachInputRow}>
          <label className={s.fileLabel} htmlFor={fileId}>
            <span>انتخاب فایل (PDF، JPG، PNG یا WEBP)</span>
            <input id={fileId} ref={fileInputRef} type="file" accept={ACCEPT} disabled={busy}
              onChange={e => selectFile(e.target.files?.[0] ?? null)} />
          </label>
          <button className={s.primary} type="button" disabled={busy || !file || loading} onClick={() => void upload()}>
            {busy ? "در حال پردازش…" : "ثبت پیوست"}
          </button>
        </div>
        <div className={s.muted}>{file ? `${file.name} · ${humanSize(file.size)}` : "حداکثر ۳ مگابایت برای هر فایل · نگهداری در دیتابیس، بدون پوشه سرور"}</div>
      </div>}
      {notice && <AppNotice kind={notice.kind}>{notice.text}</AppNotice>}
      {loading ? <p role="status" className={s.muted}>در حال دریافت فهرست پیوست‌ها…</p> :
        items.length === 0 ? <EmptyMessage title="هنوز سندی پیوست نشده" description="پیوست‌های مربوط به این بخش اینجا نمایش داده می‌شوند." /> :
        <ul className={s.fileList}>{items.map(a => <li className={s.fileItem} key={a.AttachmentId}>
          <div className={s.fileMeta}><strong>{a.OriginalFileName}</strong>
            <span>{MIME_LABELS[a.MimeType] ?? "فایل"} · {humanSize(a.FileSizeBytes)} · {new Date(a.CreatedAtUtc).toLocaleDateString("fa-IR")}</span></div>
          <div className={s.fileActions}>
            <a href={`/Api/TahghighV2/DocumentAttachmentFile?attachmentId=${encodeURIComponent(a.AttachmentId)}`}
              aria-label={`دریافت ${a.OriginalFileName}`}>دریافت فایل</a>
            {!readOnly && <button type="button" className={s.danger} disabled={busy} onClick={() => {setDeleteTarget(a);}}>حذف</button>}
          </div>
        </li>)}</ul>}
    </div>
    {deleteTarget && <div className={s.modalOverlay} role="presentation" onMouseDown={event => {if (event.target === event.currentTarget && !busy) setDeleteTarget(null);}}>
      <div className={s.modal} role="dialog" aria-modal="true" aria-labelledby={`${fileId}-delete-title`}>
        <h3 id={`${fileId}-delete-title`}>حذف پیوست</h3><p>فایل «{deleteTarget.OriginalFileName}» حذف منطقی می‌شود. سابقه حذف در سامانه ثبت می‌شود.</p>
        <div className={s.modalActions}>
          <button type="button" disabled={busy} onClick={() => setDeleteTarget(null)}>انصراف</button>
          <button type="button" className={s.danger} disabled={busy} onClick={() => void remove()}>تأیید حذف منطقی</button>
        </div>
      </div>
    </div>}
  </div>;
}
