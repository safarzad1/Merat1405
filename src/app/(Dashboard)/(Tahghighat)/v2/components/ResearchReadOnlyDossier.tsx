"use client";

import { useEffect, useRef, useState } from "react";
import s from "./ResearchReadOnlyDossier.module.css";

/** A shared read-only dossier renderer for hoze and province. The owning API performs authorization. */
export type ReadonlyDocument = {
  AttachmentId: string;
  OriginalFileName?: string | null;
  MimeType: string;
  AttachmentDescription?: string | null;
};
export type ReadonlyWorksheet = {
  id: number;
  title: string;
  report?: string | null;
  description?: string | null;
  details?: string[];
  documents: ReadonlyDocument[];
};
export type ReadonlyInvestigator = {
  id: number;
  name: string;
  status: string;
  instruction?: string | null;
  summary?: string | null;
  documents: ReadonlyDocument[];
  worksheets: ReadonlyWorksheet[];
};
export type ReadonlyBranch = {
  id: number;
  title: string;
  statusLabel: string;
  description?: string | null;
  note?: string | null;
  summaryTitle?: string;
  summary?: string | null;
  documents: ReadonlyDocument[];
  investigators: ReadonlyInvestigator[];
};

type Props = {
  title: string;
  description: string;
  branches: ReadonlyBranch[];
  loading: boolean;
  error: string;
  onClose: () => void;
  fileUrl: (doc: ReadonlyDocument) => string;
};
const fa = (value: number) => value.toLocaleString("fa-IR");
const isImage = (mime: string) => /^image\/(png|jpeg|webp)$/i.test(mime);
const valueOrEmpty = (text?: string | null) => text?.trim() || "موردی ثبت نشده است.";
const getStatus = (status: string) => status === "DONE" ? "تکمیل‌شده" : status === "CANCELLED" ? "بازپس‌گرفته‌شده" : "در حال بررسی";

function ReadonlyImageViewer({ src, title, onClose }: { src: string; title: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const priorDistance = useRef<number | null>(null);
  const clamp = (n: number) => Math.max(1, Math.min(6, n));
  const zoom = (factor: number) => setScale(v => {
    const next = clamp(v * factor);
    if (next === 1) setOffset({ x: 0, y: 0 });
    return next;
  });
  const distance = () => {
    const values = [...pointers.current.values()];
    return values.length < 2 ? null : Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  };
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.stopImmediatePropagation(); onClose(); }
    };
    document.addEventListener("keydown", onEscape, true);
    return () => document.removeEventListener("keydown", onEscape, true);
  }, [onClose]);
  return <div className={s.zoom} dir="rtl" role="dialog" aria-modal="true" aria-label={`بزرگنمایی ${title}`}>
    <div className={s.zoomToolbar}>
      <strong title={title}>{title}</strong>
      <button type="button" aria-label="کوچک‌نمایی" onClick={() => zoom(1 / 1.25)}>−</button>
      <span>{fa(Math.round(scale * 100))}٪</span>
      <button type="button" aria-label="بزرگنمایی" onClick={() => zoom(1.25)}>+</button>
      <button type="button" onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }); }}>اندازه اصلی</button>
      <button type="button" aria-label="بستن تصویر" onClick={onClose}>×</button>
    </div>
    <div className={s.zoomStage}
      onWheel={event => { event.preventDefault(); zoom(event.deltaY < 0 ? 1.12 : 1 / 1.12); }}
      onPointerDown={event => {
        event.currentTarget.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        priorDistance.current = distance();
      }}
      onPointerMove={event => {
        const old = pointers.current.get(event.pointerId);
        if (!old) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const nextDistance = distance();
        if (nextDistance !== null && priorDistance.current !== null && priorDistance.current > 0) {
          zoom(nextDistance / priorDistance.current);
        } else if (pointers.current.size === 1 && scale > 1) {
          setOffset(v => ({ x: v.x + event.clientX - old.x, y: v.y + event.clientY - old.y }));
        }
        priorDistance.current = nextDistance;
      }}
      onPointerUp={event => { pointers.current.delete(event.pointerId); priorDistance.current = distance(); }}
      onPointerCancel={event => { pointers.current.delete(event.pointerId); priorDistance.current = distance(); }}>
      <img src={src} alt={title} draggable={false} style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }} />
    </div>
    <p className={s.zoomHint}>زوم با اسکرول موس یا دو انگشت · حرکت تصویر با نگه‌داشتن و کشیدن</p>
  </div>;
}

export default function ResearchReadOnlyDossier({ title, description, branches, loading, error, onClose, fileUrl }: Props) {
  const [openedBranches, setOpenedBranches] = useState<Record<number, boolean>>({});
  const [openedInvestigators, setOpenedInvestigators] = useState<Record<number, boolean>>({});
  const [zoomDocument, setZoomDocument] = useState<ReadonlyDocument | null>(null);
  const allInvestigators = branches.flatMap(branch => branch.investigators);
  const totalWorksheets = allInvestigators.reduce((sum, inv) => sum + inv.worksheets.length, 0);
  const totalFiles = branches.reduce((sum, branch) => sum + branch.documents.length + branch.investigators.reduce((n, inv) => n + inv.documents.length + inv.worksheets.reduce((m, w) => m + w.documents.length, 0), 0), 0);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !zoomDocument) onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, zoomDocument]);
  const files = (items: ReadonlyDocument[]) => items.length ? <div className={s.files}>
    {items.map(doc => isImage(doc.MimeType) ?
      <button type="button" className={s.file} key={doc.AttachmentId} onClick={() => setZoomDocument(doc)} title="بزرگنمایی تصویر">
        <img src={fileUrl(doc)} alt={doc.OriginalFileName || "تصویر سند"} loading="lazy" />
        <span>{doc.OriginalFileName || "سند تصویری"}</span>
        {doc.AttachmentDescription && <small>{doc.AttachmentDescription}</small>}
      </button> : <a className={s.file} key={doc.AttachmentId} href={fileUrl(doc)} target="_blank" rel="noopener noreferrer">
        <span className={s.pdfIcon}>PDF</span><span>{doc.OriginalFileName || "پیوست"}</span><small>نمایش سند</small>
      </a>)}
  </div> : <p className={s.emptyFiles}>سندی پیوست نشده است.</p>;
  return <>
    <div className={s.overlay} role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={s.dialog} role="dialog" aria-modal="true" aria-labelledby="research-dossier-title" dir="rtl">
        <header className={s.header}>
          <div className={s.headline}>
            <span className={s.readonlyMark}>فقط‌خواندنی</span>
            <h2 id="research-dossier-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" className={s.close} aria-label="بستن جزئیات تحقیقات" onClick={onClose}>×</button>
        </header>
        <main className={s.body}>
          {loading && <div className={s.stateMessage} role="status">در حال دریافت گزارش و اسناد تحقیقات…</div>}
          {error && <div role="alert" className={s.error}>{error}</div>}
          {!loading && !error && <>
            <div className={s.metrics}>
              <div><span>ارجاعات و مقصدها</span><strong>{fa(branches.length)}</strong></div>
              <div><span>محققان</span><strong>{fa(allInvestigators.length)}</strong></div>
              <div><span>تحقیقات تکمیل‌شده</span><strong>{fa(allInvestigators.filter(a => a.status === "DONE").length)}</strong></div>
              <div><span>کاربرگ‌ها</span><strong>{fa(totalWorksheets)}</strong></div>
              <div><span>اسناد و پیوست‌ها</span><strong>{fa(totalFiles)}</strong></div>
            </div>
            {!branches.length && <div className={s.stateMessage}>جزئیاتی برای این ارجاع ثبت نشده است.</div>}
            {branches.map((branch, bi) => {
              const isOpened = openedBranches[branch.id] ?? true;
              return <article key={branch.id} className={s.branch}>
                <button type="button" className={s.branchTitle} aria-expanded={isOpened}
                  onClick={() => setOpenedBranches(v => ({ ...v, [branch.id]: !isOpened }))}>
                  <span className={s.branchName}><span className={s.number}>{fa(bi + 1)}</span><strong>{branch.title}</strong></span>
                  <span className={s.branchTags}><span className={s.status}>{branch.statusLabel}</span><span>{fa(branch.investigators.length)} محقق</span><span className={s.chevron}>{isOpened ? "⌃" : "⌄"}</span></span>
                </button>
                {isOpened && <div className={s.branchBody}>
                  {branch.description && <p className={s.branchDescription}>شرح ارجاع: {branch.description}</p>}
                  {branch.note && <p className={s.note}>علت عدم نیاز به تحقیق: {branch.note}</p>}
                  <section className={s.section}>
                    <h3><span className={s.headlineIcon}>۱</span>{branch.summaryTitle || "گزارش نهایی ارسالی"}</h3>
                    <div className={s.prose}>{valueOrEmpty(branch.summary)}</div>
                    {branch.documents.length > 0 && <><h4>اسناد گزارش نهایی</h4>{files(branch.documents)}</>}
                  </section>
                  <section className={s.section}>
                    <h3><span className={s.headlineIcon}>۲</span>محققان و سوابق تحقیقات <span className={s.count}>({fa(branch.investigators.length)})</span></h3>
                    {!branch.investigators.length && <p className={s.emptyFiles}>برای این ارجاع محققی ثبت نشده است.</p>}
                    {branch.investigators.map((inv, ii) => {
                      const open = openedInvestigators[inv.id] ?? (branch.investigators.length === 1);
                      return <article key={inv.id} className={s.investigator}>
                        <button type="button" className={s.investigatorTitle} aria-expanded={open}
                          onClick={() => setOpenedInvestigators(v => ({ ...v, [inv.id]: !open }))}>
                          <span className={s.investigatorName}><span className={s.numberAlt}>{fa(ii+1)}</span><strong>{inv.name}</strong></span>
                          <span className={s.investigatorInfo}>{getStatus(inv.status)} · {fa(inv.worksheets.length)} کاربرگ <span>{open ? "⌃" : "⌄"}</span></span>
                        </button>
                        {open && <div className={s.investigatorBody}>
                          {inv.instruction && <p className={s.branchDescription}>شرح مأموریت: {inv.instruction}</p>}
                          <div className={s.innerSection}><h4>متن جمع‌بندی اصلی محقق</h4><div className={s.prose}>{valueOrEmpty(inv.summary)}</div></div>
                          <div className={s.innerSection}><h4>تصاویر و اسناد جمع‌بندی محقق</h4>{files(inv.documents)}</div>
                          <div className={s.innerSection}>
                            <h4>کاربرگ‌های ثبت‌شده ({fa(inv.worksheets.length)})</h4>
                            {!inv.worksheets.length && <p className={s.emptyFiles}>کاربرگی ثبت نشده است.</p>}
                            {inv.worksheets.map((w, wi) => <div className={s.worksheet} key={w.id}>
                              <div className={s.worksheetHeader}><strong>{w.title || `کاربرگ ${fa(wi+1)}`}</strong><small>شماره {fa(w.id)}</small></div>
                              {(w.report || w.description) ? <div className={s.prose}>{valueOrEmpty(w.report || w.description)}</div> : <p className={s.emptyFiles}>متنی برای کاربرگ ثبت نشده است.</p>}
                              {w.description && w.report && w.description !== w.report && <div className={s.prose}>{w.description}</div>}
                              {w.details && w.details.length > 0 && <p className={s.details}>{w.details.join(" · ")}</p>}
                              <h5>اسناد و پیوست‌های کاربرگ</h5>{files(w.documents)}
                            </div>)}
                          </div>
                        </div>}
                      </article>;
                    })}
                  </section>
                </div>}
              </article>;
            })}
          </>}
        </main>
        <footer className={s.footer}><span>تمام اطلاعات این پنجره صرفاً برای مشاهده است.</span><button type="button" onClick={onClose}>بستن</button></footer>
      </section>
    </div>
    {zoomDocument && <ReadonlyImageViewer src={fileUrl(zoomDocument)} title={zoomDocument.OriginalFileName || "سند تحقیق"} onClose={() => setZoomDocument(null)} />}
  </>;
}
