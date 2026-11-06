"use client";

import { useEffect } from "react";
import { DEFAULT_THEME_SETTINGS, resolvedTheme, validateThemeSettings, type ThemeSettings } from "@/lib/themeSettings";

export const THEME_EVENT = "merat-theme-settings-change";

export function applyThemeSettings(settings: ThemeSettings) {
  if (typeof document === "undefined") return;
  const theme = resolvedTheme(settings);
  const root = document.documentElement;
  root.dataset.meratTheme = settings.themeId;
  root.dataset.meratDensity = settings.cardDensity;
  const tokens: Record<string, string> = {
    "--app-primary": theme.primary,
    "--app-primary-dark": theme.dark,
    "--app-gradient": theme.gradient,
    "--app-soft": theme.soft,
    "--app-accent": theme.soft,
    "--app-active-text": theme.primary,
    "--app-active-bg": "#FFFFFF",
    "--app-panel": theme.panel,
    "--app-shadow": "0 6px 20px rgba(32,36,70,.075)",
    "--ui-bg": theme.background,
    "--ui-surface": theme.card,
    "--ui-line": "#DFE5F0",
    "--ui-text": "#263553",
    "--ui-muted": "#71809C",
    "--ui-card-shadow": "0 3px 14px rgba(35,46,85,.035)",
    "--ui-font-scale": String(settings.fontScale / 100),
    "--drawer-panel": theme.panel,
    "--drawer-panel-solid": theme.sidebar,
    "--drawer-panel-dark": theme.dark,
    "--drawer-accent": theme.soft,
    "--drawer-accent-soft": theme.soft,
    "--drawer-item-active-text": "#F8F8FF",
    "--drawer-item-active-bg": `linear-gradient(90deg, ${theme.primary}40, ${theme.primary}20)`,
    "--banner-background": theme.card,
    "--banner-shadow": "0 3px 14px rgba(35,46,85,.035)",
  };
  Object.entries(tokens).forEach(([key, value]) => root.style.setProperty(key, value));
}

export function previewThemeSettings(settings: ThemeSettings) {
  applyThemeSettings(settings);
  window.dispatchEvent(new CustomEvent<ThemeSettings>(THEME_EVENT, { detail: settings }));
}

export default function ThemeRuntime({ authenticated = false }: { authenticated?: boolean }) {
  useEffect(() => {
    applyThemeSettings(DEFAULT_THEME_SETTINGS);
    if (!authenticated) return;
    let active = true;
    const controller = new AbortController();
    fetch("/Api/Theme/UserPreferences", { method: "GET", credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Theme preferences unavailable");
        return response.json();
      })
      .then((result) => {
        const next = validateThemeSettings(result?.data);
        if (active && next) previewThemeSettings(next);
      })
      .catch(() => { /* Default theme is safe while the database is unavailable. */ });
    return () => { active = false; controller.abort(); };
  }, [authenticated]);
  return null;
}
