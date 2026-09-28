"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { defaultThemeId, getThemePreset, themePresets } from "@/lib/themePresets";
import styles from "./Theme.module.css";

const STORAGE_KEY = "merat-theme";

export default function ThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState(defaultThemeId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setSelectedTheme(getThemePreset(saved).id);
    } catch {}
  }, []);

  const current = useMemo(() => getThemePreset(selectedTheme), [selectedTheme]);

  function applyTheme(themeId: string) {
    const next = getThemePreset(themeId).id;
    setSelectedTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("merat-theme-change", { detail: next }));
    }
  }

  return (
    <div
      className={styles.wrapper}
      style={{
        ["--theme-active" as string]: current.vars.drawerPanelSolid,
        ["--theme-active-soft" as string]: current.vars.drawerAccentSoft,
      } as CSSProperties}
    >
      <div className={styles.hero}>
        <div>
          <h1 className={styles.title}>تنظیم تم سامانه</h1>
          <p className={styles.subtitle}>
            یکی از رنگ‌های پیشنهادی را انتخاب کن. با انتخاب هر گزینه، ظاهر نوار بالا و دراور سمت راست بلافاصله تغییر می‌کند.
          </p>
        </div>
        <div className={styles.currentTheme}>
          <span>تم فعال</span>
          <strong>{current.name}</strong>
          <small>گرادیانت</small>
        </div>
      </div>

      <div className={styles.grid}>
        {themePresets.map((theme) => {
          const active = theme.id === selectedTheme;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => applyTheme(theme.id)}
              className={`${styles.card} ${active ? styles.cardActive : ""}`}
              aria-pressed={active}
            >
              <div
                className={styles.preview}
                style={{ background: theme.vars.bannerBackground }}
              >
                <div className={styles.previewBadge}>گرادیانت</div>
                <div className={styles.previewMiniDrawer} style={{ background: theme.vars.drawerPanel }}>
                  <span style={{ background: theme.vars.drawerItemActiveBg, color: theme.vars.drawerItemActiveText }}>منوی فعال</span>
                  <small>نمونه دراور</small>
                </div>
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardHeader}>
                  <div>
                    <strong>{theme.name}</strong>
                    <p>{theme.description}</p>
                  </div>
                  <span className={`${styles.selectState} ${active ? styles.selectStateActive : ""}`}>
                    {active ? "انتخاب شده" : "انتخاب"}
                  </span>
                </div>

                <div className={styles.swatches}>
                  {theme.preview.map((color, index) => (
                    <span key={`${theme.id}-${index}-${color}`} style={{ background: color }} />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
