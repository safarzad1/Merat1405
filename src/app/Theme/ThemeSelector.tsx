"use client";

import ThemeControls from "@/component/ThemeDock/ThemeControls";
import styles from "@/component/ThemeDock/ThemeDock.module.css";

export default function ThemeSelector() {
  return <div className={styles.pageControls}>
    <h1>تنظیم تم و شخصی‌سازی ظاهر</h1>
    <ThemeControls />
  </div>;
}
