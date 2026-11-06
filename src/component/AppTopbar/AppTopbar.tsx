"use client";

import Image from "next/image";
import SocketStatus from "@/component/SocketStatus";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./AppTopbar.module.css";
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
  OnvanPost?: string | null;
  OnvanSemat?: string | null;
  NameMahal?: string | null;
};

type MenuEntry = {
  label: string;
  href?: string;
  icon: "dashboard" | "tasks" | "news" | "research" | "people" | "election" | "users" | "mail" | "theme" | "settings";
  children?: Array<{ label: string; href: string }>;
};

function Icon({ name }: { name: MenuEntry["icon"] | "logout" | "chevron" | "menu" | "close" | "user" }) {
  if (name === "dashboard") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="3.5" width="6.5" height="6.5" rx="1.5"/><rect x="3.5" y="14" width="6.5" height="6.5" rx="1.5"/><rect x="14" y="14" width="6.5" height="6.5" rx="1.5"/></svg>;
  }
  if (name === "tasks") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="m7 9 2 2 3-4M14 9h3M7 16h10"/></svg>;
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
  if (name === "settings") {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.15.37.36.7.6 1 .3.3.7.4 1.1.4H21v4h-.09a1.7 1.7 0 0 0-1.51.6Z"/></svg>;
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

export default function AppTopbar({ fullName = "", postId = 0 }: AppTopbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const headerRef = useRef<HTMLElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState(0);
  useEffect(() => {
    const refresh = () => { setAvatarError(false); setAvatarVersion(Date.now()); };
    window.addEventListener("merat-profile-photo-updated", refresh);
    return () => window.removeEventListener("merat-profile-photo-updated", refresh);
  }, []);
  const [storedUser, setStoredUser] = useState<StoredUser>({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [positionTitle, setPositionTitle] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("merat-user");
      if (raw) setStoredUser(JSON.parse(raw) as StoredUser);
    } catch {
      setStoredUser({});
    }

  }, []);

  useEffect(() => {
    let active = true;
    fetch("/Api/Users/CurrentPosition", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("POSITION_UNAVAILABLE");
        const data = await response.json() as { positionTitle?: string };
        return String(data.positionTitle ?? "").trim();
      })
      .then((title) => { if (active) setPositionTitle(title); })
      .catch(() => { /* Existing login data is used as a fallback. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = () => {
      fetch("/Api/Users/AdminAccess", { credentials: "same-origin", cache: "no-store" })
        .then(async (response) => response.ok ? (await response.json()).isAdmin === true : false)
        .then((allowed) => { if (active) setIsAdmin(allowed); })
        .catch(() => { if (active) setIsAdmin(false); });
    };
    refresh();
    window.addEventListener("merat-admin-updated", refresh);
    return () => { active = false; window.removeEventListener("merat-admin-updated", refresh); };
  }, [pathname]);

  useEffect(() => {
    setOpenMenu(null);
    setSettingsOpen(false);
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
    if (!settingsOpen) return;
    const closeWhenOutside = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        settingsRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [settingsOpen]);

  useEffect(() => {
    document.body.classList.toggle("merat-drawer-open", mobileOpen);
    return () => document.body.classList.remove("merat-drawer-open");
  }, [mobileOpen]);

  const mahalLength = String(storedUser.Mahal ?? "").length || 99;

  const menuItems = useMemo<MenuEntry[]>(() => {
    const base: MenuEntry[] = [
      { label: "داشبورد", href: "/Dashboard", icon: "dashboard" },
    ];

    // Visibility is only a convenience; database-backed authorization is enforced
    // independently in the new module page and TaskManagementV2 stored procedure.
    if ((postId >= 1 && postId <= 5) || (postId >= 50 && postId <= 56)) {
      base.push({ label: "برنامه‌ها و وظایف", href: "/TaskManagement", icon: "tasks" });
    }

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

    // اخبار برای تمام سطوح سازمانی فعال است؛ پست‌های RollId=5 فعلاً در گردش خبر نقشی ندارند.
    if (![54, 55, 56].includes(postId)) {
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

    base.push({
      label: "تعامل و تماس",
      icon: "people",
      children: [
        { label: "تعامل", href: "/TaamolSazman/Jadid" },
        { label: "تماس", href: "/TaamolSazman/Tamas" },
      ],
    });

    if (mahalLength <= 3) {
      base.push({
        label: "کاربران",
        icon: "users",
        children: [
          ...(Number(storedUser.Mahal) === 1 ? [{ label: "کاربران ستاد", href: "/Users/FehrestUsers/Setad" }] : []),
          { label: "کاربران استان و شهرستان", href: "/Users/FehrestUsers/Ostan" },
        ],
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
  }, [mahalLength, postId, storedUser.Mahal]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/Logout", { method: "POST", cache: "no-store" });
    } finally {
      try { localStorage.removeItem("merat-user"); } catch {}
      router.replace("/Login");
      router.refresh();
    }
  }

  const storedPosition = String(storedUser.OnvanPost || storedUser.OnvanSemat || "").trim();
  const mahalName = String(storedUser.NameMahal || "").trim();
  const fallbackPosition = storedPosition && mahalName && !storedPosition.includes(mahalName)
    ? `${storedPosition} ${mahalName}`
    : storedPosition;
  const userPosition = positionTitle || fallbackPosition;
  const displayName = String(fullName || storedUser.FullName || "").trim() || "کاربر";

  return (
    <header className={`${styles.header} ${mobileOpen ? styles.headerShifted : ""}`} ref={headerRef} dir="rtl">
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

        <div className={styles.legacyIdentity} dir="ltr">
          <SocketStatus />
          <div className={styles.headerSettings} ref={settingsRef}>
            <button
              type="button"
              className={`${styles.settingsTrigger} ${settingsOpen || pathname === "/Theme" || pathname === "/AdminSettings" ? styles.settingsTriggerActive : ""}`}
              aria-label="تنظیمات"
              title="تنظیمات"
              aria-expanded={settingsOpen}
              aria-haspopup="true"
              aria-controls="merat-topbar-settings"
              onClick={() => setSettingsOpen((value) => !value)}
            >
              <Icon name="settings" />
            </button>
            {settingsOpen ? (
              <nav id="merat-topbar-settings" className={styles.settingsDropdown} dir="rtl" aria-label="منوی تنظیمات">
                <Link href="/Profile" className={`${styles.settingsOption} ${pathActive(pathname, "/Profile") ? styles.settingsOptionActive : ""}`} onClick={() => setSettingsOpen(false)}>
                  <Icon name="user" />
                  <span>پروفایل من و امضا</span>
                </Link>
                <Link href="/Theme" className={`${styles.settingsOption} ${pathActive(pathname, "/Theme") ? styles.settingsOptionActive : ""}`} onClick={() => setSettingsOpen(false)}>
                  <Icon name="theme" />
                  <span>تم و ظاهر سامانه</span>
                </Link>
                {isAdmin ? (
                  <Link href="/AdminSettings" className={`${styles.settingsOption} ${pathActive(pathname, "/AdminSettings") ? styles.settingsOptionActive : ""}`} onClick={() => setSettingsOpen(false)}>
                    <Icon name="settings" />
                    <span>تنظیمات مدیریت سامانه</span>
                  </Link>
                ) : null}
              </nav>
            ) : null}
          </div>
          {userPosition ? (
            <span className={styles.positionTitle} dir="rtl" title={userPosition}>{userPosition}</span>
          ) : null}
        </div>
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
          <Link href="/Profile" className={styles.drawerUserCard} title="پروفایل، تغییر تصویر، کلمه عبور و ثبت امضا">
            <span className={styles.drawerUserAvatar}>
              {!avatarError ? (
                <Image
                  src={`/Api/Users/MyAvatar?v=${avatarVersion}`}
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
              <strong title={displayName}>{displayName}</strong>
            </span>
          </Link>
          <button type="button" className={styles.drawerLogout} onClick={logout} disabled={loggingOut}>
            <span className={styles.drawerLogoutIcon}><Icon name="logout" /></span>
            <span>{loggingOut ? "در حال خروج..." : "خروج از حساب"}</span>
          </button>
        </div>
      </aside>
    </header>
  );
}
