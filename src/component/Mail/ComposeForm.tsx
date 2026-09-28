"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Save, Send, Trash2, X } from "lucide-react";
import { MailGroup } from "@/services/ApiServiceMail";
import { useMeratUser } from "@/lib/useMeratUser";
import RecipientMultiSelect from "./RecipientMultiSelect";
import MailEditor from "./MailEditor";
import { isEmptyHtml, sendMailMessage } from "./mailClient";
import type { MailGroupRow, PickedRecipient } from "./types";
import styles from "./Mail.module.css";

export default function ComposeForm() {
  const user = useMeratUser();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [groups, setGroups] = useState<MailGroupRow[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [selected, setSelected] = useState<PickedRecipient[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success" | "info"; text: string } | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user.UserId || !user.Mahal) return;
      setLoadingGroups(true);
      try {
        const res: any = await MailGroup(user.Mahal, user.UserId);
        if (res?.status === 401) return router.push("/Login");
        if (alive) setGroups(Array.isArray(res?.data) ? res.data : []);
      } catch { if (alive) setNotice({ type: "error", text: "خطا در دریافت فهرست گیرندگان." }); }
      finally { if (alive) setLoadingGroups(false); }
    };
    load();
    return () => { alive = false; };
  }, [user.UserId, user.Mahal, router]);

  const addFiles = (files: File[]) => {
    setAttachments((prev) => {
      const keys = new Set(prev.map((x) => `${x.name}-${x.size}`));
      return [...prev, ...files.filter((x) => !keys.has(`${x.name}-${x.size}`))];
    });
  };

  const submit = async (isSend: 0 | 1) => {
    if (!user.UserId) return setNotice({ type: "error", text: "اطلاعات کاربر در دسترس نیست." });
    if (!subject.trim()) return setNotice({ type: "error", text: "عنوان پیام را وارد کنید." });
    if (isEmptyHtml(body)) return setNotice({ type: "error", text: "متن پیام را وارد کنید." });
    if (isSend === 1 && selected.length === 0) return setNotice({ type: "error", text: "حداقل یک گیرنده انتخاب کنید." });
    setBusy(true); setNotice(null);
    try {
      const result = await sendMailMessage({ subject: subject.trim(), body, isSend, senderUserId: user.UserId, selected, groups, attachments });
      if (result.status === 401) return router.push("/Login");
      window.dispatchEvent(new Event("mail-sent"));
      setNotice({ type: "success", text: isSend ? "پیام با موفقیت ارسال شد." : "پیش‌نویس ذخیره شد." });
      setTimeout(() => router.push(isSend ? "/Mail/sent" : "/Mail/drafts"), 450);
    } catch (e: any) { setNotice({ type: "error", text: e?.message || "عملیات ناموفق بود." }); }
    finally { setBusy(false); }
  };

  return <section className={styles.panel}>
    <div className={styles.panelHeader}>
      <div className={styles.panelTitle}>نوشتن پیام جدید</div>
      <button className={styles.smallButton} type="button" onClick={() => router.back()}><X size={15} /> بستن</button>
    </div>
    <div className={styles.composePanel}>
      {notice ? <div className={`${styles.notice} ${notice.type === "error" ? styles.noticeError : notice.type === "success" ? styles.noticeSuccess : styles.noticeInfo}`}>{notice.text}</div> : null}
      <div className={styles.field}><label>گیرندگان</label><RecipientMultiSelect items={groups} loading={loadingGroups} value={selected} onChange={setSelected} /></div>
      <div className={styles.field}><label>عنوان پیام</label><input className={styles.input} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={3000} placeholder="عنوان پیام را وارد کنید..." /></div>
      <div className={styles.field}><label>متن پیام</label><MailEditor value={body} onChange={setBody} /></div>
      <div className={styles.attachmentZone}>
        <div className={styles.attachmentHeader}>
          <button type="button" className={styles.smallButton} onClick={() => fileRef.current?.click()}><Paperclip size={15} /> افزودن پیوست</button>
          {attachments.length ? <button type="button" className={styles.dangerButton} onClick={() => setAttachments([])}><Trash2 size={14} /> حذف همه</button> : null}
        </div>
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files || [])); e.target.value = ""; }} />
        {attachments.length ? <div className={styles.attachmentList}>{attachments.map((f, i) => <div key={`${f.name}-${f.size}-${i}`} className={styles.attachmentItem}><span>{f.name}</span><button type="button" onClick={() => setAttachments((x) => x.filter((_, idx) => idx !== i))}><X size={13} /></button></div>)}</div> : <div className={styles.unsupported} style={{ marginTop: 8, padding: 10 }}>پیوستی انتخاب نشده است.</div>}
      </div>
      <div className={styles.composeActions}>
        <button type="button" className={styles.secondaryButton} disabled={busy} onClick={() => submit(0)}><Save size={15} /> ذخیره پیش‌نویس</button>
        <button type="button" className={styles.primaryButton} disabled={busy} onClick={() => submit(1)}><Send size={15} /> {busy ? "در حال ارسال..." : "ارسال پیام"}</button>
      </div>
    </div>
  </section>;
}
