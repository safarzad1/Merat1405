"use client";

import { useEffect, useState } from "react";
import ThemeControls from "./ThemeControls";
import styles from "./ThemeDock.module.css";

export default function ThemeDock() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);
  return (
    <div className={styles.dock} dir="rtl">
      {open ? (
        <>
          <button type="button" aria-label="بستن تنظیمات ظاهر" className={styles.backdrop} onClick={() => setOpen(false)} />
          <div className={styles.popover} role="dialog" aria-label="شخصی‌سازی ظاهر مرآت" aria-modal="false">
            <div className={styles.popoverHeader}>
              <div><strong>شخصی‌سازی ظاهر</strong><small>تنظیم اختصاصی حساب شما</small></div>
              <button type="button" onClick={() => setOpen(false)} aria-label="بستن">×</button>
            </div>
            <div className={styles.popoverBody}><ThemeControls /></div>
          </div>
        </>
      ) : null}
      <button className={styles.launcher} type="button" title="انتخاب رنگ و تم" aria-label="تنظیم رنگ و تم" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 2.5 2.5 0 0 0 2.3-3.5c-.5-1.2.1-2.5 1.7-2.5h1.4A4.6 4.6 0 0 0 22 10.4 9 9 0 0 0 12 3Z"/><circle cx="7" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/><circle cx="17.5" cy="11.5" r="1"/></svg>
      </button>
    </div>
  );
}
