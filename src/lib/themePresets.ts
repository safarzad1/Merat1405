export type ThemePreset = {
  id: string;
  name: string;
  description: string;
  mode: "gradient";
  preview: string[];
  vars: {
    drawerPanel: string;
    drawerPanelSolid: string;
    drawerPanelDark: string;
    drawerAccent: string;
    drawerAccentSoft: string;
    drawerItemHover: string;
    drawerItemActiveText: string;
    drawerItemActiveBg: string;
    drawerSubmenuBorder: string;
    drawerFooterBg: string;
    drawerLogoutBg: string;
    drawerLogoutHover: string;
    bannerBackground: string;
    bannerShadow: string;
  };
};

type ThemeSeed = {
  id: string;
  name: string;
  description: string;
  colors: [string, string, string];
  dark: string;
  soft: string;
  accent: string;
  shadow: string;
};

function makeTheme(seed: ThemeSeed): ThemePreset {
  const [start, middle, end] = seed.colors;

  return {
    id: seed.id,
    name: seed.name,
    description: seed.description,
    mode: "gradient",
    preview: [start, middle, end],
    vars: {
      drawerPanel: `linear-gradient(180deg, ${start} 0%, ${middle} 58%, ${end} 100%)`,
      drawerPanelSolid: start,
      drawerPanelDark: seed.dark,
      drawerAccent: seed.accent,
      drawerAccentSoft: seed.soft,
      drawerItemHover: "rgba(255,255,255,.10)",
      drawerItemActiveText: start,
      drawerItemActiveBg: "#ffffff",
      drawerSubmenuBorder: "rgba(255,255,255,.23)",
      drawerFooterBg: "rgba(255,255,255,.11)",
      drawerLogoutBg: "rgba(0,0,0,.16)",
      drawerLogoutHover: "rgba(0,0,0,.25)",
      bannerBackground: `linear-gradient(100deg, ${start} 0%, ${middle} 52%, ${end} 100%)`,
      bannerShadow: `0 10px 26px ${seed.shadow}`,
    },
  };
}

export const themePresets: ThemePreset[] = [
  makeTheme({
    id: "petrol-teal",
    name: "آبی نفتی",
    description: "رسمی، آرام و مناسب برای فضای سازمانی.",
    colors: ["#245F68", "#2E7C83", "#214F5A"],
    dark: "#193F48",
    soft: "#EDF7F8",
    accent: "#E4F2F4",
    shadow: "rgba(31,111,120,.18)",
  }),
  makeTheme({
    id: "emerald-jade",
    name: "زمرد و یشم",
    description: "سبز عمیق و ملایم با حس اعتماد و ثبات.",
    colors: ["#2C6E62", "#3F8E78", "#28584F"],
    dark: "#204A42",
    soft: "#ECF8F3",
    accent: "#E3F4EC",
    shadow: "rgba(44,110,98,.18)",
  }),
  makeTheme({
    id: "navy-royal",
    name: "سرمه‌ای سلطنتی",
    description: "رسمی و شفاف با کنتراست مناسب برای استفاده روزانه.",
    colors: ["#324C78", "#486AA0", "#283E66"],
    dark: "#213453",
    soft: "#F0F4FA",
    accent: "#E6EDF8",
    shadow: "rgba(50,76,120,.19)",
  }),
  makeTheme({
    id: "indigo-violet",
    name: "نیلی بنفش",
    description: "مدرن و متین با ترکیب نیلی و بنفش کنترل‌شده.",
    colors: ["#514C8A", "#6C62A8", "#433D72"],
    dark: "#37325F",
    soft: "#F3F0FA",
    accent: "#EBE7F7",
    shadow: "rgba(81,76,138,.18)",
  }),
  makeTheme({
    id: "ocean-cyan",
    name: "اقیانوسی",
    description: "آبی شفاف و زنده بدون تندی رنگ‌های روشن.",
    colors: ["#2E6687", "#3E8AA0", "#29566F"],
    dark: "#23485D",
    soft: "#EDF7FA",
    accent: "#E3F1F6",
    shadow: "rgba(46,102,135,.18)",
  }),
  makeTheme({
    id: "slate-steel",
    name: "اسلیت فولادی",
    description: "خنثی، مرتب و مناسب محیط‌های اداری رسمی.",
    colors: ["#53687D", "#70879B", "#455769"],
    dark: "#394958",
    soft: "#F2F5F8",
    accent: "#E8EDF2",
    shadow: "rgba(83,104,125,.18)",
  }),
  makeTheme({
    id: "forest-olive",
    name: "جنگلی زیتونی",
    description: "سبز گرم‌تر با هویت طبیعی و ظاهر حرفه‌ای.",
    colors: ["#4B6A52", "#70845B", "#3F5846"],
    dark: "#34493A",
    soft: "#F2F6EF",
    accent: "#E9F0E5",
    shadow: "rgba(75,106,82,.18)",
  }),
  makeTheme({
    id: "plum-rose",
    name: "آلویی رز",
    description: "ترکیب خاص آلویی و رز برای ظاهر متفاوت اما رسمی.",
    colors: ["#704C67", "#946478", "#5A3E59"],
    dark: "#4A3349",
    soft: "#FAF0F5",
    accent: "#F4E6EE",
    shadow: "rgba(112,76,103,.18)",
  }),
  makeTheme({
    id: "graphite-bronze",
    name: "گرافیتی برنزی",
    description: "لوکس، سنگین و مناسب برای تم‌های مدیریتی.",
    colors: ["#4E5662", "#746B5C", "#414852"],
    dark: "#343A42",
    soft: "#F6F3EC",
    accent: "#EEE8DC",
    shadow: "rgba(78,86,98,.19)",
  }),
  makeTheme({
    id: "sapphire-purple",
    name: "یاقوت آبی",
    description: "آبی سافایر با ته‌رنگ بنفش و جلوه مدرن.",
    colors: ["#3F568C", "#655EAA", "#354775"],
    dark: "#2C3B61",
    soft: "#F0F1FA",
    accent: "#E7E9F7",
    shadow: "rgba(63,86,140,.18)",
  }),
  makeTheme({
    id: "copper-sunset",
    name: "مسی غروب",
    description: "گرادیانت گرم و کنترل‌شده برای ظاهر متفاوت‌تر.",
    colors: ["#865A4B", "#A87557", "#6C4A43"],
    dark: "#593D37",
    soft: "#FAF2EE",
    accent: "#F4E7E0",
    shadow: "rgba(134,90,75,.18)",
  }),
  makeTheme({
    id: "midnight-teal",
    name: "نیمه‌شب فیروزه‌ای",
    description: "تیره‌تر، شکیل و مناسب نمایشگرهای بزرگ و محیط کم‌نور.",
    colors: ["#263F52", "#2F6B71", "#223544"],
    dark: "#1B2C38",
    soft: "#EDF4F5",
    accent: "#E2ECEE",
    shadow: "rgba(38,63,82,.20)",
  }),
  makeTheme({
    id: "azure-indigo",
    name: "لاجوردی نیلی",
    description: "گرادیانت نرم آبی-نیلی با ظاهر مدرن و تمیز.",
    colors: ["#356C9A", "#536AB2", "#2E577E"],
    dark: "#274968",
    soft: "#EFF3FB",
    accent: "#E5ECF8",
    shadow: "rgba(53,108,154,.18)",
  }),
  makeTheme({
    id: "sage-blue",
    name: "مریم‌گلی آبی",
    description: "آرام‌ترین گزینه با ترکیب سبز خاکستری و آبی نرم.",
    colors: ["#5D786F", "#6D8992", "#4D655F"],
    dark: "#40544F",
    soft: "#F1F6F4",
    accent: "#E7F0ED",
    shadow: "rgba(93,120,111,.18)",
  }),
];

export const defaultThemeId = "petrol-teal";

export function getThemePreset(id?: string | null): ThemePreset {
  return themePresets.find((item) => item.id === id) ?? themePresets[0];
}
