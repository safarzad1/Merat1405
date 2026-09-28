"use client";

import Link from "next/link";
import { Mail, Paperclip } from "lucide-react";
import { encryptText } from "@/lib/cryptoUtil";
import type { MailMessage } from "./types";
import styles from "./Mail.module.css";

export default function MessageRow({ msg, sent = false }: { msg: MailMessage; sent?: boolean }) {
  const encrypted = encodeURIComponent(encryptText(String(msg.id)));
  const person = sent ? (msg.recipientNames?.join("، ") || msg.recipientName || "گیرنده نامشخص") : msg.senderName;
  return <Link href={`/Mail/message/${encrypted}`} className={`${styles.messageRow} ${msg.isNew ? styles.messageRowUnread : ""}`}>
    <span className={styles.messageIcon}><Mail size={16} /></span>
    <div className={styles.sender}>{sent ? `به: ${person}` : person}</div>
    <div className={styles.subject}>
      <div className={styles.subjectLine}>{msg.subject || "(بدون عنوان)"}</div>
      <div className={styles.preview}>{msg.preview || "—"}</div>
      <div className={styles.rowFlags}>
        {msg.isNew ? <span className={styles.newFlag}>جدید</span> : null}
        {msg.attachmentsCount > 0 ? <span className={styles.attachFlag}><Paperclip size={11} /> {msg.attachmentsCount}</span> : null}
      </div>
    </div>
    <div className={styles.date}>{msg.createdAt}</div>
  </Link>;
}
