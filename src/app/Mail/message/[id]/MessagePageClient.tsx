"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Download, Paperclip } from "lucide-react";
import { MessageByID, MessageFilesByID, ReadMessageset } from "@/services/ApiServiceMail";
import { useMeratUser } from "@/lib/useMeratUser";
import ForwardBox from "@/component/Mail/ForwardBox";
import styles from "@/component/Mail/Mail.module.css";

type Msg = { OnvanPayam: string; Payam: string; CreateDateTime: string; SenderUserName: string; ReciverUserName?: string };
type FileRow = { FileName: string; CaptionName: string; MMType?: string | null };
function rowsOf(res: any) { return Array.isArray(res?.data) ? res.data : Array.isArray(res?.recordset) ? res.recordset : []; }
function safeHtml(html: string) { return String(html || "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/\son\w+\s*=\s*(["']).*?\1/gi, ""); }

export default function MessagePageClient({ id }: { id: string }) {
  const router = useRouter();
  const user = useMeratUser();
  const mid = useMemo(() => Number(id), [id]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [error, setError] = useState("");
  const marked = useRef<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(mid) || !user.UserId || marked.current === mid) return;
    marked.current = mid;
    ReadMessageset(mid, user.UserId).then((r: any) => { if (r?.status === 401) router.push("/Login"); else { window.dispatchEvent(new Event("mail-read")); window.dispatchEvent(new Event("mail-refresh")); } }).catch(() => { marked.current = null; });
  }, [mid, user.UserId, router]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!Number.isFinite(mid)) { setError("شناسه پیام نامعتبر است."); setLoading(false); return; }
      setLoading(true); setError("");
      try {
        const [detailRes, filesRes] = await Promise.all([MessageByID(mid), MessageFilesByID(mid)]);
        if (detailRes?.status === 401 || filesRes?.status === 401) return router.push("/Login");
        const detailRows = rowsOf(detailRes); const row = detailRows[0];
        if (!row) throw new Error("پیام پیدا نشد.");
        if (!alive) return;
        setMsg({ OnvanPayam: String(row.OnvanPayam || ""), Payam: String(row.Payam || ""), CreateDateTime: String(row.CreateDateTime || ""), SenderUserName: String(row.SenderUserName || ""), ReciverUserName: String(row.ReciverUserName || "") });
        setFiles(rowsOf(filesRes).filter((x: any) => Number(x?.IsDelete ?? 0) === 0).map((x: any) => ({ FileName: String(x.FileName || ""), CaptionName: String(x.CaptionName || ""), MMType: x.MMType ?? null })).filter((x: FileRow) => x.FileName));
      } catch (e: any) { if (alive) setError(e?.message || "خطا در دریافت پیام"); }
      finally { if (alive) setLoading(false); }
    };
    load(); return () => { alive = false; };
  }, [mid, router]);

  if (loading) return <section className={styles.panel}><div className={styles.loading}>در حال دریافت پیام...</div></section>;
  if (error || !msg) return <section className={styles.panel}><div className={styles.listBody}><div className={`${styles.notice} ${styles.noticeError}`}>{error || "پیام پیدا نشد."}</div></div></section>;
  return <section className={styles.panel}>
    <div className={styles.viewer}>
      <div className={styles.messageHeaderCard}>
        <button type="button" className={styles.backButton} onClick={() => router.back()} title="بازگشت"><ArrowRight size={17}/></button>
        <div className={styles.messageMeta}><div className={styles.messageTitle}>{msg.OnvanPayam || "بدون عنوان"}</div><div className={styles.metaLine}><span>فرستنده: {msg.SenderUserName || "نامشخص"}</span>{msg.ReciverUserName ? <><span>•</span><span>گیرنده: {msg.ReciverUserName}</span></> : null}<span>•</span><span>{msg.CreateDateTime}</span></div></div>
      </div>
      <div className={styles.viewerGrid}>
        <article className={styles.messageBody} dangerouslySetInnerHTML={{ __html: safeHtml(msg.Payam) }} />
        <aside className={styles.attachments}>
          <div className={styles.attachmentsTitle}><span><Paperclip size={15} style={{ verticalAlign: "middle", marginLeft: 5 }}/>پیوست‌ها</span><span>{files.length} فایل</span></div>
          {files.length === 0 ? <div className={styles.empty} style={{ minHeight: 80 }}>پیوستی ندارد.</div> : <div className={styles.fileList}>{files.map((f, i) => <div className={styles.fileItem} key={`${f.FileName}-${i}`}><div className={styles.fileInfo}><div className={styles.fileName}>{f.CaptionName || f.FileName}</div><div className={styles.fileType}>{f.MMType || "فایل"}</div></div><a className={styles.downloadLink} href={`/MessageUploads/${encodeURIComponent(f.FileName)}`} target="_blank" rel="noreferrer" download><Download size={13}/>دانلود</a></div>)}</div>}
        </aside>
      </div>
      <ForwardBox original={{ subject: msg.OnvanPayam, bodyHtml: msg.Payam, senderName: msg.SenderUserName, createdAt: msg.CreateDateTime }} />
    </div>
  </section>;
}
