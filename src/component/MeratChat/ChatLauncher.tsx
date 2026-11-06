"use client";

import { useEffect, useState } from "react";
import { Headset, X } from "lucide-react";
import { usePathname } from "next/navigation";
import ChatWorkspace from "./ChatWorkspace";
import { listenForChatChanges } from "./chatRealtime";
import styles from "./ChatLauncher.module.css";

export default function ChatLauncher() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [mounted, setMounted] = useState(false);
  const hidden = path === "/ChatRoom" || path.startsWith("/ChatRoom/") || path === "/Login" || path.startsWith("/Login/") || path === "/Logout" || path.startsWith("/Logout/");

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    if (hidden) return;
    let active = true;
    const load = async () => {
      try {
        const r = await fetch("/Api/ChatRoom?mode=unread", { cache: "no-store" });
        const result = await r.json() as { success?: boolean; data?: { count?: number } };
        if (active && r.ok && result.success) setUnread(Math.max(0, Number(result.data?.count || 0)));
      } catch { /* connection may be temporarily offline */ }
    };
    void load();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void load(); }, 8000);
    const off = listenForChatChanges(() => { void load(); }, () => undefined);
    const onRefresh = () => { void load(); };
    window.addEventListener("merat-chat:refresh", onRefresh);
    return () => { active = false; clearInterval(timer); off(); window.removeEventListener("merat-chat:refresh", onRefresh); };
  }, [hidden]);
  useEffect(() => {
    if (!open) return;
    const esc = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", esc);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", esc); document.body.style.overflow = original; };
  }, [open]);
  if (!mounted || hidden) return null;
  return <>
    <button type="button" className={styles.launcher} onClick={() => setOpen(true)} title="پیام‌رسان" aria-label="باز کردن پیام‌رسان">
      <Headset size={25} />
      {unread > 0 && <span className={styles.badge}>{String(unread > 99 ? "99+" : unread).replace(/\d/g, (x) => "۰۱۲۳۴۵۶۷۸۹"[Number(x)])}</span>}
    </button>
    {open && <div className={styles.layer} dir="rtl">
      <button className={styles.backdrop} type="button" aria-label="بستن پیام‌رسان" onClick={() => setOpen(false)} />
      <section className={styles.drawer} role="dialog" aria-modal="true" aria-label="پنجره پیام‌رسان">
        <header className={styles.header}><div className={styles.title}><span><Headset size={21} /></span><div><strong>پیام‌رسان</strong><small>ارتباط مستقیم با همکاران</small></div></div><button type="button" onClick={() => setOpen(false)} aria-label="بستن"><X size={21} /></button></header>
        <div className={styles.body}><ChatWorkspace compact /></div>
      </section>
    </div>}
  </>;
}
