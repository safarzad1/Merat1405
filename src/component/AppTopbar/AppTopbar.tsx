"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import styles from "./AppTopbar.module.css";
import { defaultThemeId, getThemePreset } from "@/lib/themePresets";
import legacyCouncilTitle from "./assets/legacy-council-title.png";
import legacyMeratMark from "./assets/legacy-merat-mark.png";

type AppTopbarProps = {
  fullName?: string;
  postId?: number;
};

type StoredUser = {
  Mahal?: string | number | null;
  DateNow?: string | null;
  FullName?: string | null;
  OnvanSemat?: string | null;
};

type MenuEntry = {
  label: string;
  href?: string;
  icon: "dashboard" | "news" | "research" | "people" | "election" | "users" | "mail" | "theme";
  children?: Array<{ label: string; href: string }>;
};

function Icon({ name }: { name: MenuEntry["icon"] | "logout" | "chevron" | "menu" | "close" | "user" }) {
  if (name === "dashboard") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="14" width="6.5" height="6.5" rx="1.5"/></svg>;
  }
  if (name === "news") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h11v16H5z"/><path d="M16 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3"/></svg>;
  }
  if (name === "research") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5h6l1.5 2H20v9.5H4z"/><path d="M4 7.5V5h6l1.5 2.5M9 14h6M12 11v6"/></svg>;
  }
  if (name === "people") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19v-1a5.5 5.5 0 0 1 11 0v1M15.5 6a3 3 0 0 1 0 5.5M16.5 14a4.5 4.5 0 0 1 4 4.5V19"/></svg>;
  }
  if (name === "election") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="9" width="16" height="11" rx="2"/><path d="m8 9 2-5h4l2 5M9 14h6M12 12v4"/></svg>;
  }
  if (name === "users") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/><path d="M18 5.5h3M19.5 4v3"/></svg>;
  }
  if (name === "mail") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/></svg>;
  }
  if (name === "theme") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.9 0 3.5-1.3 3.5-3 0-.7-.2-1.3-.6-1.8-.3-.4-.4-.8-.4-1.3 0-1.3 1-2.4 2.3-2.4h1.1a3.6 3.6 0 0 0 3.6-3.6A8.9 8.9 0 0 0 12 3.5Z"/><circle cx="7.7" cy="11.5" r="1"/><circle cx="10.2" cy="8" r="1"/><circle cx="14" cy="8.3" r="1"/><circle cx="16.4" cy="12" r="1"/></svg>;
  }
  if (name === "logout") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M18 12H9"/></svg>;
  }
  if (name === "chevron") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>;
  }
  if (name === "menu") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>;
  }
  if (name === "close") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5.5 20a6.5 6.5 0 0 1 13 0"/></svg>;
}

function pathActive(pathname: string, href?: string) {
  if (!href) return false;
  if (href === "/Dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AppTopbar({ fullName, postId = 0 }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [storedUser, setStoredUser] = useState<StoredUser>({});
  const [avatarError, setAvatarError] = useState(false);
  const [themeId, setThemeId] = useState(defaultThemeId);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("merat-user");
      if (raw) setStoredUser(JSON.parse(raw) as StoredUser);
    } catch {
      setStoredUser({});
    }

    try {
      const savedTheme = localStorage.getItem("merat-theme");
      if (savedTheme) setThemeId(getThemePreset(savedTheme).id);
    } catch {}
  }, []);

  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

  useEffect(() => {
    function closeMenus(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("merat-drawer-open", mobileOpen);
    return () => document.body.classList.remove("merat-drawer-open");
  }, [mobileOpen]);

  useEffect(() => {
    function handleThemeEvent(event: Event) {
      const next = (event as CustomEvent<string>).detail;
      if (typeof next === "string") setThemeId(getThemePreset(next).id);
    }

    function handleStorage(event: StorageEvent) {
      if (event.key === "merat-theme") setThemeId(getThemePreset(event.newValue).id);
    }

    window.addEventListener("merat-theme-change", handleThemeEvent as EventListener);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("merat-theme-change", handleThemeEvent as EventListener);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const mahalLength = String(storedUser.Mahal ?? "").length || 99;

  const menuItems = useMemo<MenuEntry[]>(() => {
    const base: MenuEntry[] = [
      { label: "داشبورد", href: "/Dashboard", icon: "dashboard" },
      { label: "تنظیم تم", href: "/Theme", icon: "theme" },
    ];

    if (postId === 54) {
      return [
        ...base,
        { label: "مدیریت تحقیقات", href: "/TahghighatManage", icon: "research" },
        {
          label: "ارتباطات",
          icon: "mail",
          children: [
            { label: "صندوق پستی", href: "/Mail" },
            { label: "پیام‌رسان", href: "/ChatRoom" },
          ],
        },
      ];
    }

    if (postId === 55) {
      return [
        ...base,
        {
          label: "داوطلبان انتخابات",
          icon: "election",
          children: [
            { label: "فهرست ثبت‌نام قطعی", href: "/Davtalab/Davtalaban" },
            { label: "فهرست پیش‌ثبت‌نام", href: "/Davtalab/CardDavtalab" },
          ],
        },
        {
          label: "ارتباطات",
          icon: "mail",
          children: [
            { label: "صندوق پستی", href: "/Mail" },
            { label: "پیام‌رسان", href: "/ChatRoom" },
          ],
        },
      ];
    }

    if (mahalLength === 1) {
      base.push({ label: "مدیریت اخبار", href: "/AkhbarManage", icon: "news" });
    }

    base.push({ label: "مدیریت تحقیقات", href: "/TahghighatManage", icon: "research" });

    if (postId !== 56) {
      base.push({ label: "همکاران", href: "/Persons/Hamkari", icon: "people" });
    }

    base.push({
      label: "مجلس دوازدهم",
      icon: "election",
      children: [
        { label: "فهرست ثبت‌نام قطعی", href: "/Davtalab/Davtalaban" },
        { label: "فهرست پیش‌ثبت‌نام", href: "/Davtalab/CardDavtalab" },
      ],
    });

    if (mahalLength <= 3) {
      base.push({
        label: "کاربران",
        icon: "users",
        children: [{ label: "مدیریت کاربران", href: "/Users/FehrestUsers/Ostan" }],
      });
    }

    base.push({
      label: "ارتباطات",
      icon: "mail",
      children: [
        { label: "صندوق پستی", href: "/Mail" },
        { label: "پیام‌رسان", href: "/ChatRoom" },
      ],
    });

    return base;
  }, [mahalLength, postId]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/Api/Auth/Logout", { method: "POST", cache: "no-store" });
    } finally {
      try { localStorage.removeItem("merat-user"); } catch {}
      router.replace("/Login");
      router.refresh();
    }
  }

  const selectedTheme = getThemePreset(themeId);
  const displayName = storedUser.FullName || fullName || "کاربر سامانه";

  const themeStyle = {
    ["--drawer-panel" as string]: selectedTheme.vars.drawerPanel,
    ["--drawer-panel-solid" as string]: selectedTheme.vars.drawerPanelSolid,
    ["--drawer-panel-dark" as string]: selectedTheme.vars.drawerPanelDark,
    ["--drawer-accent" as string]: selectedTheme.vars.drawerAccent,
    ["--drawer-accent-soft" as string]: selectedTheme.vars.drawerAccentSoft,
    ["--drawer-item-hover" as string]: selectedTheme.vars.drawerItemHover,
    ["--drawer-item-active-text" as string]: selectedTheme.vars.drawerItemActiveText,
    ["--drawer-item-active-bg" as string]: selectedTheme.vars.drawerItemActiveBg,
    ["--drawer-submenu-border" as string]: selectedTheme.vars.drawerSubmenuBorder,
    ["--drawer-footer-bg" as string]: selectedTheme.vars.drawerFooterBg,
    ["--drawer-logout-bg" as string]: selectedTheme.vars.drawerLogoutBg,
    ["--drawer-logout-hover" as string]: selectedTheme.vars.drawerLogoutHover,
    ["--banner-background" as string]: selectedTheme.vars.bannerBackground,
    ["--banner-shadow" as string]: selectedTheme.vars.bannerShadow,
  } as CSSProperties;

  return (
    <header className={`${styles.header} ${mobileOpen ? styles.headerShifted : ""}`} style={themeStyle} ref={headerRef} dir="rtl">
      <div className={styles.legacyBanner}>
        <Link href="/Dashboard" className={styles.legacyCouncil} aria-label="صفحه اصلی مرآت">
          <Image
            src={legacyCouncilTitle}
            alt="شورای نگهبان"
            width={352}
            height={67}
            className={styles.legacyCouncilImage}
            priority
          />
        </Link>

        <Link href="/Dashboard" className={styles.legacyMark} aria-label="سامانه مرآت">
          <Image
            src={legacyMeratMark}
            alt="مرآت"
            width={110}
            height={62}
            className={styles.legacyMarkImage}
            priority
          />
        </Link>

      </div>

      <button
        type="button"
        className={`${styles.drawerBackdrop} ${mobileOpen ? styles.drawerBackdropOpen : ""}`}
        onClick={() => setMobileOpen(false)}
        aria-label="بستن منو"
        tabIndex={mobileOpen ? 0 : -1}
      />

      {!mobileOpen ? (
        <button
          type="button"
          className={styles.drawerReopen}
          onClick={() => setMobileOpen(true)}
          aria-label="باز کردن منوی اصلی"
          title="باز کردن منو"
        >
          <Icon name="menu" />
        </button>
      ) : null}

      <aside className={`${styles.drawer} ${mobileOpen ? styles.drawerOpen : ""}`} aria-hidden={!mobileOpen}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerBrand}>
            <Image src="/Logo.png" alt="مرآت" width={42} height={42} className={styles.drawerLogo} />
            <span>
              <strong>سامانه مرآت</strong>
              <small>منوی اصلی سامانه</small>
            </span>
          </div>
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMobileOpen(false)}
            aria-label="بستن منو"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className={styles.drawerNav}>
          {menuItems.map((item) => {
            const childActive = item.children?.some((child) => pathActive(pathname, child.href)) ?? false;
            const active = pathActive(pathname, item.href) || childActive;

            if (!item.children) {
              return (
                <Link
                  key={item.label}
                  href={item.href || "/Dashboard"}
                  className={`${styles.drawerItem} ${active ? styles.drawerItemActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className={styles.drawerItemIcon}><Icon name={item.icon} /></span>
                  <span>{item.label}</span>
                </Link>
              );
            }

            const opened = openMenu === item.label;
            return (
              <div className={styles.drawerGroup} key={item.label}>
                <button
                  type="button"
                  className={`${styles.drawerItem} ${active ? styles.drawerItemActive : ""}`}
                  onClick={() => setOpenMenu((value) => value === item.label ? null : item.label)}
                  aria-expanded={opened}
                >
                  <span className={styles.drawerItemIcon}><Icon name={item.icon} /></span>
                  <span>{item.label}</span>
                  <span className={`${styles.drawerChevron} ${opened ? styles.drawerChevronOpen : ""}`}><Icon name="chevron" /></span>
                </button>

                {opened ? (
                  <div className={styles.drawerSubmenu}>
                    {item.children.map((child) => {
                      const subActive = pathActive(pathname, child.href);
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`${styles.drawerSubitem} ${subActive ? styles.drawerSubitemActive : ""}`}
                        >
                          <span className={styles.drawerDot} />
                          <span>{child.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className={styles.drawerFooter}>
          <div className={styles.drawerUserCard}>
            <span className={styles.drawerUserAvatar}>
              {!avatarError ? (
                <Image
                  src="/person.png"
                  alt="تصویر کاربر"
                  width={38}
                  height={38}
                  className={styles.drawerUserAvatarImage}
                  onError={() => setAvatarError(true)}
                  unoptimized
                />
              ) : (
                <Icon name="user" />
              )}
            </span>
            <span className={styles.drawerUserInfo}>
              <strong>{displayName}</strong>
              <small>{storedUser.OnvanSemat || "کاربر سامانه"}</small>
            </span>
          </div>

          <button type="button" className={styles.drawerLogout} onClick={logout} disabled={loggingOut}>
            <span className={styles.drawerLogoutIcon}><Icon name="logout" /></span>
            <span>{loggingOut ? "در حال خروج..." : "خروج از حساب"}</span>
          </button>
        </div>
      </aside>
    </header>
  );
}
