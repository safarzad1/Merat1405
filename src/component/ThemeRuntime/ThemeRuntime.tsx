"use client";

import { useEffect } from "react";
import { defaultThemeId, getThemePreset } from "@/lib/themePresets";

const STORAGE_KEY = "merat-theme";

function applyTheme(themeId?: string | null) {
  const theme = getThemePreset(themeId || defaultThemeId);
  const root = document.documentElement;

  root.dataset.meratTheme = theme.id;
  root.style.setProperty("--app-primary", theme.vars.drawerPanelSolid);
  root.style.setProperty("--app-primary-dark", theme.vars.drawerPanelDark);
  root.style.setProperty("--app-gradient", theme.vars.bannerBackground);
  root.style.setProperty("--app-soft", theme.vars.drawerAccentSoft);
  root.style.setProperty("--app-accent", theme.vars.drawerAccent);
  root.style.setProperty("--app-active-text", theme.vars.drawerItemActiveText);
  root.style.setProperty("--app-active-bg", theme.vars.drawerItemActiveBg);
  root.style.setProperty("--app-panel", theme.vars.drawerPanel);
  root.style.setProperty("--app-shadow", theme.vars.bannerShadow);
}

export default function ThemeRuntime() {
  useEffect(() => {
    try {
      applyTheme(localStorage.getItem(STORAGE_KEY));
    } catch {
      applyTheme(defaultThemeId);
    }

    function handleThemeChange(event: Event) {
      const id = (event as CustomEvent<string>).detail;
      applyTheme(id);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) applyTheme(event.newValue);
    }

    window.addEventListener("merat-theme-change", handleThemeChange as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("merat-theme-change", handleThemeChange as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return null;
}
