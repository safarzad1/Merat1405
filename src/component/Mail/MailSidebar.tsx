"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Archive, FileText, Inbox, Send, ShieldAlert, Star, Trash2 } from "lucide-react";
import { MessageCount } from "@/services/ApiServiceMail";
import { useMeratUser } from "@/lib/useMeratUser";
import styles from "./Mail.module.css";

const items = [
  { href: "/Mail/inbox", label: "صندوق ورودی", Icon: Inbox, key: "inbox" },
  { href: "/Mail/sent", label: "ارسال‌شده", Icon: Send, key: "sent" },
  { href: "/Mail/drafts", label: "پیش‌نویس‌ها", Icon: FileText, key: "drafts" },
  { href: "/Mail/important", label: "مهم", Icon: Star, key: "important" },
  { href: "/Mail/archive", label: "آرشیو", Icon: Archive, key: "archive" },
  { href: "/Mail/trash", label: "زباله‌دان", Icon: Trash2, key: "trash" },
  { href: "/Mail/spam", label: "هرزنامه", Icon: ShieldAlert, key: "spam" },
];

export default function MailSidebar() {
  const pathname = usePathname();
  const user = useMeratUser();
  const [newInbox, setNewInbox] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!user.UserId) return;
      try {
        const res: any = await MessageCount(user.UserId);
        const n = Number(res?.data?.[0]?.NewInbox ?? 0);
        if (alive) setNewInbox(Number.isFinite(n) ? n : 0);
      } catch { if (alive) setNewInbox(0); }
    };
    load();
    window.addEventListener("mail-read", load);
    window.addEventListener("mail-refresh", load);
    return () => {
      alive = false;
      window.removeEventListener("mail-read", load);
      window.removeEventListener("mail-refresh", load);
    };
  }, [user.UserId]);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarTitle}>پوشه‌ها</div>
      <nav className={styles.nav}>
        {items.map(({ href, label, Icon, key }) => {
          const active = pathname === href || (pathname === "/Mail" && key === "inbox");
          return (
            <Link key={href} href={href} className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}>
              <Icon /><span>{label}</span>
              {key === "inbox" && newInbox > 0 ? <span className={styles.navCount}>{newInbox}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
