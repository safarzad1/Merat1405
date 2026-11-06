import { defaultThemeId, getThemePreset, themePresets, type ThemePreset } from "@/lib/themePresets";

export type ThemeSettings = {
  themeId: string;
  primaryColor: string | null;
  sidebarColor: string | null;
  backgroundColor: string | null;
  cardColor: string | null;
  fontScale: number;
  cardDensity: "regular" | "compact";
};

export const DEFAULT_THEME_SETTINGS: ThemeSettings = {
  themeId: defaultThemeId,
  primaryColor: null,
  sidebarColor: null,
  backgroundColor: null,
  cardColor: null,
  fontScale: 100,
  cardDensity: "regular",
};

const validHex = /^#[0-9a-fA-F]{6}$/;
const colorKeys = ["primaryColor", "sidebarColor", "backgroundColor", "cardColor"] as const;

export function validateThemeSettings(input: unknown): ThemeSettings | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const item = input as Record<string, unknown>;
  if (typeof item.themeId !== "string" || !themePresets.some((theme) => theme.id === item.themeId)) return null;
  const fontScale = Number(item.fontScale ?? 100);
  if (![100, 105, 110, 115].includes(fontScale)) return null;
  if (item.cardDensity !== "regular" && item.cardDensity !== "compact") return null;
  const settings: ThemeSettings = {
    ...DEFAULT_THEME_SETTINGS,
    themeId: item.themeId,
    fontScale,
    cardDensity: item.cardDensity,
  };
  for (const key of colorKeys) {
    const value = item[key];
    if (value !== null && value !== undefined && (typeof value !== "string" || !validHex.test(value))) return null;
    settings[key] = typeof value === "string" ? value.toUpperCase() : null;
  }
  return settings;
}

function colorMix(color: string, target: string, amount: number): string {
  const parse = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16);
  const result = [1, 3, 5].map((i) => Math.round(parse(color, i) * (1 - amount) + parse(target, i) * amount));
  return `#${result.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function resolvedTheme(settings: ThemeSettings): {
  preset: ThemePreset;
  primary: string;
  sidebar: string;
  background: string;
  card: string;
  soft: string;
  gradient: string;
  panel: string;
  dark: string;
} {
  const preset = getThemePreset(settings.themeId);
  const primary = settings.primaryColor || (settings.themeId === defaultThemeId ? "#5B50DC" : preset.vars.drawerPanelSolid);
  const sidebar = settings.sidebarColor || (settings.themeId === defaultThemeId ? "#202443" : preset.vars.drawerPanelSolid);
  const background = settings.backgroundColor || "#F4F6FB";
  const card = settings.cardColor || "#FFFFFF";
  const dark = colorMix(primary, "#101830", .28);
  const soft = colorMix(primary, "#FFFFFF", .92);
  return {
    preset,
    primary,
    sidebar,
    background,
    card,
    soft,
    dark,
    gradient: `linear-gradient(135deg, ${primary} 0%, ${colorMix(primary, "#7066EA", .22)} 100%)`,
    panel: `linear-gradient(180deg, ${sidebar} 0%, ${colorMix(sidebar, "#111733", .13)} 100%)`,
  };
}
