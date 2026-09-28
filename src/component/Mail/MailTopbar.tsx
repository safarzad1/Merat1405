"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, PenLine, Search } from "lucide-react";
import { MessageCount } from "@/services/ApiServiceMail";
import { useMeratUser } from "@/lib/useMeratUser";
import styles from "./Mail.module.css";

export default function MailTopbar() {
  const user = useMeratUser();
  const [count, setCount] = useState(0);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user.UserId) return;
      try {
        const res: any = await MessageCount(user.UserId);
        const n = Number(res?.data?.[0]?.NewInbox ?? 0);
        if (alive) setCount(Number.isFinite(n) ? n : 0);
      } catch {
        if (alive) setCount(0);
      }
    };
    load();
    const refresh = () => load();
    window.addEventListener("mail-read", refresh);
    window.addEventListener("mail-sent", refresh);
    window.addEventListener("mail-refresh", refresh);
    return () => {
      alive = false;
      window.removeEventListener("mail-read", refresh);
      window.removeEventListener("mail-sent", refresh);
      window.removeEventListener("mail-refresh", refresh);
    };
  }, [user.UserId]);

  const onSearch = (value: string) => {
    setSearch(value);
    window.dispatchEvent(new CustomEvent("mail-search", { detail: value }));
  };

  return (
    <header className={styles.topbar}>
      <div className={styles.brand}>
        <span className={styles.brandIcon}><Mail size={19} /></span>
        <span className={styles.brandText}>صندوق پستی</span>
        {count > 0 ? <span className={styles.badge}>{count}</span> : null}
      </div>
      <div className={styles.globalSearch}>
        <Search />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="جستجو در پیام‌ها؛ فرستنده، گیرنده، عنوان و متن..." />
      </div>
      <div className={styles.topActions}>
        <Link href="/Mail/compose" className={styles.composeLink}><PenLine size={16} /> نوشتن پیام جدید</Link>
      </div>
    </header>
  );
}
