"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Forward, Paperclip, Send, X } from "lucide-react";
import { MailGroup } from "@/services/ApiServiceMail";
import { useMeratUser } from "@/lib/useMeratUser";
import RecipientMultiSelect from "./RecipientMultiSelect";
import MailEditor from "./MailEditor";
import { isEmptyHtml, sendMailMessage } from "./mailClient";
import type { MailGroupRow, PickedRecipient } from "./types";
import styles from "./Mail.module.css";

function forwardHtml(original: { subject: string; bodyHtml: string; senderName: string; createdAt: string }) {
  return `<div dir="rtl"><p><strong>--- فوروارد پیام ---</strong></p><p><strong>از:</strong> ${original.senderName || "نامشخص"}</p><p><strong>تاریخ:</strong> ${original.createdAt || ""}</p><p><strong>موضوع:</strong> ${original.subject || "(بدون عنوان)"}</p><hr/><div>${original.bodyHtml || ""}</div></div>`;
}

export default function ForwardBox({ original, onSent }: { original: { subject: string; bodyHtml: string; senderName: string; createdAt: string }; onSent?: () => void }) {
  const user = useMeratUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<MailGroupRow[]>([]);
  const [selected, setSelected] = useState<PickedRecipient[]>([]);
  const [subject, setSubject] = useState(original.subject || "");
  const [body, setBody] = useState(() => forwardHtml(original));
  const [attachments, setAttachments] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setSubject(original.subject || ""); setBody(forwardHtml(original)); setSelected([]); setAttachments([]); setNotice("");
  }, [original.subject, original.bodyHtml, original.senderName, original.createdAt]);

  useEffect(() => {
    let alive = true;
    if (!user.UserId || !user.Mahal) return;
    MailGroup(user.Mahal, user.UserId).then((r: any) => { if (alive) setGroups(Array.isArray(r?.data) ? r.data : []); }).catch(() => {});
    return () => { alive = false; };
  }, [user.UserId, user.Mahal]);

  const send = async () => {
    if (!user.UserId || !selected.length || !subject.trim() || isEmptyHtml(body)) return setNotice("گیرنده، عنوان و متن پیام را کامل کنید.");
    setBusy(true); setNotice("");
    try {
      await sendMailMessage({ subject, body, isSend: 1, senderUserId: user.UserId, selected, groups, attachments });
      setNotice("پیام با موفقیت فوروارد شد."); setSelected([]); setAttachments([]); onSent?.(); window.dispatchEvent(new Event("mail-sent"));
    } catch (e: any) { setNotice(e?.message || "ارسال پیام ناموفق بود."); }
    finally { setBusy(false); }
  };

  return <section className={styles.forward}>
    <div className={styles.forwardHead}>
      <span style={{ fontSize: 13.5, color: "#405067" }}><Forward size={15} style={{ verticalAlign: "middle", marginLeft: 6 }} />فوروارد پیام</span>
      <button type="button" onClick={() => setOpen((v) => !v)}>{open ? <><ChevronUp size={15}/> بستن</> : <><ChevronDown size={15}/> باز کردن</>}</button>
    </div>
    {open ? <div className={styles.forwardBody}>
      {notice ? <div className={`${styles.notice} ${notice.includes("موفقیت") ? styles.noticeSuccess : styles.noticeError}`}>{notice}</div> : null}
      <div className={styles.field}><label>گیرندگان</label><RecipientMultiSelect items={groups} value={selected} onChange={setSelected} /></div>
      <div className={styles.field}><label>عنوان</label><input className={styles.input} value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div className={styles.field}><label>متن</label><MailEditor value={body} onChange={setBody} /></div>
      <div className={styles.attachmentZone}>
        <button type="button" className={styles.smallButton} onClick={() => fileRef.current?.click()}><Paperclip size={14}/> افزودن پیوست</button>
        <input ref={fileRef} hidden type="file" multiple onChange={(e) => { const list = Array.from(e.target.files || []); setAttachments((p) => [...p, ...list]); e.target.value = ""; }} />
        {attachments.length ? <div className={styles.attachmentList}>{attachments.map((f, i) => <div className={styles.attachmentItem} key={`${f.name}-${i}`}><span>{f.name}</span><button type="button" onClick={() => setAttachments((p) => p.filter((_, n) => n !== i))}><X size={12}/></button></div>)}</div> : null}
      </div>
      <div className={styles.composeActions}><button type="button" className={styles.primaryButton} disabled={busy} onClick={send}><Send size={15}/>{busy ? "در حال ارسال..." : "ارسال فوروارد"}</button></div>
    </div> : null}
  </section>;
}
