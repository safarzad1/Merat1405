"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { MessageByID, MessageFilesByID, MessageInbox } from "@/services/ApiServiceMail";
import { useMeratUser } from "@/lib/useMeratUser";
import MessageRow from "./MessageRow";
import type { MailFolder, MailMessage } from "./types";
import styles from "./Mail.module.css";

function stripHtml(value: string) { return String(value || "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
function rowsOf(res: any) { return Array.isArray(res?.data) ? res.data : Array.isArray(res?.recordset) ? res.recordset : []; }

export default function MessageList({ title, folder = "inbox" }: { title: string; folder?: MailFolder }) {
  const user = useMeratUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: Event) => setSearch(String((e as CustomEvent).detail || ""));
    window.addEventListener("mail-search", handler as EventListener);
    return () => window.removeEventListener("mail-search", handler as EventListener);
  }, []);

  const load = useCallback(async () => {
    if (!user.UserId) return;
    if (!["inbox", "sent", "important", "archive"].includes(folder)) { setMessages([]); setError(""); return; }
    setLoading(true); setError("");
    try {
      const boxValue = folder === "sent" ? 2 : 1;
      const inbox: any = await MessageInbox(user.UserId, boxValue);
      if (inbox?.status === 401) return;
      const base = rowsOf(inbox);
      const grouped = new Map<string, any[]>();
      for (const row of base) {
        const id = String(row?.MessageId ?? ""); if (!id) continue;
        const arr = grouped.get(id) || []; arr.push(row); grouped.set(id, arr);
      }
      const built = await Promise.all(Array.from(grouped.entries()).map(async ([id, rows]) => {
        const first = rows[0] || {};
        let detail = first;
        if (detail?.OnvanPayam == null || detail?.Payam == null || detail?.CreateDateTime == null) {
          try { const d: any = await MessageByID(Number(id)); detail = { ...first, ...(rowsOf(d)[0] || {}) }; } catch {}
        }
        let attachCount = Number(detail?.AttachMessage ?? 0);
        if (!attachCount) { try { const f: any = await MessageFilesByID(Number(id)); attachCount = rowsOf(f).filter((x: any) => Number(x?.IsDelete ?? 0) === 0).length; } catch {} }
        const body = String(detail?.Payam ?? "");
        const recipients = rows.map((x: any) => String(x?.ReciverUserName ?? "").trim()).filter(Boolean);
        const isRead = folder === "sent" ? true : Number(first?.ReadMessage ?? detail?.ReadMessage ?? 0) === 1;
        return {
          id,
          subject: String(detail?.OnvanPayam ?? "").trim() || "(بدون عنوان)",
          body,
          senderName: String(first?.SenderUserName ?? detail?.SenderUserName ?? "").trim() || "نامشخص",
          senderId: String(first?.SenderUserId ?? detail?.SenderUserId ?? first?.CreateUserId ?? ""),
          recipientName: recipients[0] || String(detail?.ReciverUserName ?? ""),
          recipientNames: Array.from(new Set(recipients)),
          createdAt: String(detail?.CreateDateTime ?? first?.CreateDateTime ?? ""),
          isRead,
          isNew: !isRead,
          attachmentsCount: attachCount,
          preview: stripHtml(body).slice(0, 170),
          isImportant: Boolean(Number(first?.IsImportant ?? detail?.IsImportant ?? 0)),
          isArchived: Boolean(Number(first?.IsArchive ?? detail?.IsArchive ?? 0)),
          isDeleted: Boolean(Number(first?.IsDelete ?? detail?.IsDelete ?? 0)),
        } as MailMessage;
      }));
      let result = built;
      if (folder === "important") result = built.filter((m) => m.isImportant);
      if (folder === "archive") result = built.filter((m) => m.isArchived);
      result.sort((a, b) => Number(b.id) - Number(a.id));
      setMessages(result);
      window.dispatchEvent(new Event("mail-refresh"));
    } catch (e: any) { setError(e?.message || "خطا در دریافت پیام‌ها"); setMessages([]); }
    finally { setLoading(false); }
  }, [user.UserId, folder]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return messages;
    return messages.filter((m) => [m.subject, m.body, m.preview, m.senderName, ...(m.recipientNames || [])].join(" ").toLowerCase().includes(q));
  }, [messages, search]);
  const unread = visible.filter((m) => m.isNew).length;
  const unsupported = folder === "drafts" ? "در سامانه قبلی ذخیره پیش‌نویس وجود دارد، اما سرویس فهرست پیش‌نویس‌ها تعریف نشده است." : folder === "trash" ? "در سامانه قبلی سرویس مستقلی برای فهرست پیام‌های حذف‌شده تعریف نشده است." : folder === "spam" ? "در سامانه قبلی سرویس مستقلی برای فهرست هرزنامه تعریف نشده است." : "";

  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div className={styles.panelTitle}>{title}{unread > 0 ? <span className={styles.panelTitleBadge}>{unread} جدید</span> : null}</div>
      <div className={styles.panelTools}><button type="button" className={styles.smallButton} onClick={load} disabled={loading || !!unsupported}><RefreshCw size={14} /> {loading ? "در حال دریافت..." : "بروزرسانی"}</button></div>
    </div>
    <div className={styles.listBody}>
      {error ? <div className={`${styles.notice} ${styles.noticeError}`}>{error}</div> : null}
      {unsupported ? <div className={styles.unsupported}>{unsupported}</div> : loading ? <div className={styles.loading}>در حال دریافت پیام‌ها...</div> : visible.length === 0 ? <div className={styles.empty}>{search ? "پیامی مطابق جستجو یافت نشد." : "پیامی برای نمایش وجود ندارد."}</div> : <div className={styles.messageList}>{visible.map((m) => <MessageRow key={m.id} msg={m} sent={folder === "sent"} />)}</div>}
    </div>
  </section>;
}
