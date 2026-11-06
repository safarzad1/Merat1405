"use client";

import { useEffect, useState } from "react";
import { themePresets } from "@/lib/themePresets";
import { DEFAULT_THEME_SETTINGS, resolvedTheme, validateThemeSettings, type ThemeSettings } from "@/lib/themeSettings";
import { previewThemeSettings, THEME_EVENT } from "@/component/ThemeRuntime/ThemeRuntime";
import styles from "./ThemeDock.module.css";

const editableColors: Array<{ key: "primaryColor" | "sidebarColor" | "backgroundColor" | "cardColor"; label: string }> = [
  { key: "primaryColor", label: "رنگ اصلی و دکمه‌ها" },
  { key: "sidebarColor", label: "رنگ منوی کناری" },
  { key: "backgroundColor", label: "پس‌زمینه سامانه" },
  { key: "cardColor", label: "زمینه کارت‌ها" },
];

export default function ThemeControls() {
  const [settings, setSettings] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [saved, setSaved] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/Api/Theme/UserPreferences", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("خواندن تنظیمات از پایگاه داده انجام نشد");
        return response.json();
      })
      .then((payload) => {
        const value = validateThemeSettings(payload.data);
        if (active && value) { setSettings(value); setSaved(value); previewThemeSettings(value); }
      })
      .catch((error) => { if (active) setMessage(error instanceof Error ? error.message : "خطای دریافت اطلاعات"); })
      .finally(() => { if (active) setLoading(false); });
    const listener = (event: Event) => {
      const value = validateThemeSettings((event as CustomEvent<ThemeSettings>).detail);
      if (active && value) setSettings(value);
    };
    window.addEventListener(THEME_EVENT, listener);
    return () => { active = false; window.removeEventListener(THEME_EVENT, listener); };
  }, []);

  function change(next: ThemeSettings) {
    setSettings(next);
    setMessage("");
    previewThemeSettings(next);
  }

  const palette = resolvedTheme(settings);
  const colorValues: Record<(typeof editableColors)[number]["key"], string> = {
    primaryColor: palette.primary,
    sidebarColor: palette.sidebar,
    backgroundColor: palette.background,
    cardColor: palette.card,
  };

  async function save() {
    if (saving || loading) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/Api/Theme/UserPreferences", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "ذخیره انجام نشد");
      const value = validateThemeSettings(payload.data);
      if (!value) throw new Error("پاسخ ذخیره نامعتبر است");
      setSettings(value);
      setSaved(value);
      previewThemeSettings(value);
      setMessage("تنظیمات ظاهر برای حساب شما ذخیره شد.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خطای ذخیره تنظیمات");
    } finally { setSaving(false); }
  }

  return (
    <div className={styles.controls} dir="rtl" aria-busy={loading || saving}>
      <p className={styles.intro}>رنگ‌بندی، فونت و تراکم کارت‌ها را انتخاب کنید. تغییرات بلافاصله پیش‌نمایش داده می‌شوند؛ برای نگهداری در حساب خود دکمه ذخیره را بزنید.</p>
      <div className={styles.sectionTitle}>تم‌های آماده</div>
      <div className={styles.themeGrid}>
        {themePresets.map((theme) => (
          <button key={theme.id} type="button" disabled={loading || saving}
            className={`${styles.preset} ${theme.id === settings.themeId ? styles.presetActive : ""}`}
            onClick={() => change({ ...settings, themeId: theme.id, primaryColor: null, sidebarColor: null })}
            aria-pressed={theme.id === settings.themeId} title={theme.description}>
            <span className={styles.palette}>
              {theme.preview.map((color, index) => <span key={`${theme.id}-${index}`} style={{ backgroundColor: color }} />)}
            </span>
            <span className={styles.presetLabel}>{theme.name}</span>
          </button>
        ))}
      </div>
      <div className={styles.sectionTitle}>رنگ‌های دلخواه</div>
      <div className={styles.colorGrid}>
        {editableColors.map(({ key, label }) => (
          <label key={key} className={styles.colorRow}>
            <span>{label}</span>
            <span className={styles.colorInput}>
              <input type="color" aria-label={label} value={colorValues[key]}
                disabled={loading || saving}
                onChange={(event) => change({ ...settings, [key]: event.target.value.toUpperCase() })} />
              <small dir="ltr">{colorValues[key].toUpperCase()}</small>
            </span>
          </label>
        ))}
      </div>
      <div className={styles.sectionTitle}>فونت و اندازه کارت‌ها</div>
      <div className={styles.optionGrid}>
        <label className={styles.selectLabel}>اندازه متن
          <select value={settings.fontScale} disabled={loading || saving}
            onChange={(event) => change({ ...settings, fontScale: Number(event.target.value) })}>
            <option value={100}>استاندارد نمونه (۱۰۰٪)</option>
            <option value={105}>کمی درشت‌تر (۱۰۵٪)</option>
            <option value={110}>درشت (۱۱۰٪)</option>
            <option value={115}>خیلی درشت (۱۱۵٪)</option>
          </select>
        </label>
        <label className={styles.selectLabel}>تراکم کارت‌ها
          <select value={settings.cardDensity} disabled={loading || saving}
            onChange={(event) => change({ ...settings, cardDensity: event.target.value as ThemeSettings["cardDensity"] })}>
            <option value="regular">استاندارد نمونه بازرگانی</option>
            <option value="compact">فشرده‌تر</option>
          </select>
        </label>
      </div>
      <div className={styles.preview}>
        <span className={styles.previewSide} style={{ background: palette.sidebar }} />
        <div className={styles.previewMain} style={{ background: palette.background }}>
          <span className={styles.previewHeader} style={{ background: palette.card }} />
          <div className={styles.previewCards}>
            <span style={{ background: palette.card }} />
            <span style={{ background: palette.card }} />
          </div>
          <span className={styles.previewAction} style={{ background: palette.gradient }} />
        </div>
      </div>
      {message ? <p className={styles.message} role="status">{message}</p> : null}
      <div className={styles.actions}>
        <button type="button" className={styles.resetButton} disabled={loading || saving}
          onClick={() => change(DEFAULT_THEME_SETTINGS)}>بازگشت به تم پیش‌فرض</button>
        <button type="button" className={styles.cancelButton} disabled={loading || saving}
          onClick={() => change(saved)}>لغو تغییرات</button>
        <button type="button" className={styles.saveButton} disabled={loading || saving} onClick={save}>
          {saving ? "در حال ذخیره..." : "ذخیره برای حساب من"}
        </button>
      </div>
    </div>
  );
}
