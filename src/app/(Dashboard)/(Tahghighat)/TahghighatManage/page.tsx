"use client";

import { useEffect, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { Inbox, Send, FileText, Trash2, Menu, User, Download } from "@/component/ResearchIcons";
import { Home, Newspaper } from "@/component/ResearchIcons";
import Kartabl from "./Kartabl";
import Breadcrumbkhabar from "@/component/Breadcrumb/Breadcrumb";
import { Get_AmarTahghight_Shahrestan, GetTahghighat } from "@/services/ApiService";
import { meratV2Request } from "@/app/lib/meratV2/client";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";
import DirectorV2Inbox from "@/app/(Dashboard)/(Tahghighat)/v2/raeesdaftar/DirectorInboxClient";
import SetadInboxClient from "@/app/(Dashboard)/(Tahghighat)/v2/setad/SetadInboxClient";

interface AmarItem {
  ID: number;
  PID: number;
  NameFarsi: string;
  Value: number;
  IsActive: boolean | null;
  Latin: string;
  CountParvandeh: number;
}

interface MenuItem {
  id: number;
  title: string;
  icon: ReactNode;
  count: number;
}

const getIcon = (item?: AmarItem) => {
  if (!item) return <Inbox size={18} />;
  switch (item.Value) {
    case 1:
      return <Inbox size={18} />;
    case 2:
      return <FileText size={18} />;
    case 3:
      return <Send size={18} />;
    case 4:
      return <Trash2 size={18} />;
    case 5:
      return <Send size={18} />;
    default:
      return <Inbox size={18} />;
  }
};

export default function MailLayout() {
  const user = useMeratUser();
  const router = useRouter();

  const [amarData, setAmarData] = useState<AmarItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [mahal] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (!hasLoaded && user?.Mahal) {
      if (Number(user.PostId) === 50) { setHasLoaded(true); return; }
      const fetchData = async () => {
        if (Number(user.PostId) === 70) {
          try {
            const rows = await meratV2Request("/Api/TahghighV2/CountyInbox?page=1&pageSize=100");
            const items: AmarItem[] = [
              { ID: 1, PID: 0, NameFarsi: "کل پرونده", Value: 1, IsActive: true, Latin: "ALL", CountParvandeh: rows.length },
              { ID: 2, PID: 0, NameFarsi: "پیشخوان", Value: 2, IsActive: true, Latin: "INBOX", CountParvandeh: rows.filter(r => ["CHILD_INBOX", "CHILD_WORKING"].includes(String(r.StateCode))).length },
              { ID: 3, PID: 0, NameFarsi: "ارسال شده", Value: 3, IsActive: true, Latin: "REPLIED", CountParvandeh: rows.filter(r => r.StateCode === "CHILD_REPLIED").length },
            ];
            setAmarData(items);
            setMenuItems(items.map(item => ({ id: item.Value, title: item.NameFarsi, icon: getIcon(item), count: item.CountParvandeh })));
            setSelectedMenu(1);
          } catch (e) { console.error("County V2 inbox:", e); }
          finally { setHasLoaded(true); }
          return;
        }
        const result = await Get_AmarTahghight_Shahrestan(user.Mahal, user.UserId);
        if (result.status === 401) {
          router.push("/Login");
          return;
        }

        let data: AmarItem[] = result.data || [];
        // HOZE V2 is the single source of truth for counts (open and sent).
        // Sent cases must remain visible even after the child referral is closed.
        if ([60, 61].includes(Number(user.PostId))) {
          try {
            const rows = await meratV2Request("/Api/TahghighV2/ChildInbox?page=1&pageSize=100");
            const openCount = rows.filter(r => ["CHILD_INBOX", "CHILD_WORKING"].includes(String(r.StateCode))).length;
            const sentCount = rows.filter(r => r.StateCode === "CHILD_REPLIED").length;
            data = data.map(item => item.Value === 1 ? { ...item, CountParvandeh: rows.length }
              : item.Value === 2 ? { ...item, CountParvandeh: openCount }
              : item.Value === 3 ? { ...item, CountParvandeh: sentCount } : item);
          } catch (error) {
            console.error("HOZE V2 inbox count:", error);
          }
        }
        // Province inbox counter uses the same V2 query and filter as the actual
        // grid. In particular, replies returned by a HOZE must keep the parent
        // provincial case in the inbox until its own review is completed.
        if ([51, 52, 53].includes(Number(user.PostId))) {
          try {
            const inbox = await GetTahghighat(2, 0, user.Mahal, 1, 100, 1, 1, "", 2, user.UserId);
            if (inbox.status === 200 && Array.isArray(inbox.data)) {
              const provinceInboxCount = inbox.data.length > 0
                ? Number(inbox.data[0].TotalCount ?? inbox.data.length) : 0;
              let externalProvinceCount = 0;
              if ([51, 52].includes(Number(user.PostId))) {
                const children = await meratV2Request("/Api/TahghighV2/ChildInbox?page=1&pageSize=100");
                externalProvinceCount = children.filter(r =>
                  String(r.ReceiverLevel) === "OSTAN" &&
                  ["CHILD_INBOX", "CHILD_WORKING"].includes(String(r.StateCode))
                ).length;
              }
              data = data.map(item => item.Value === 2
                ? { ...item, CountParvandeh: provinceInboxCount + externalProvinceCount }
                : item);
            }
          } catch (error) {
            console.error("Province V2 inbox count:", error);
          }
        }
        setAmarData(data);
        const newMenuItems: MenuItem[] = data.map((item) => ({
          id: item.Value,
          title: item.NameFarsi,
          icon: getIcon(item),
          count: item.CountParvandeh,
        }));
        setMenuItems(newMenuItems);
        if (data.length > 0) setSelectedMenu(
          new URLSearchParams(window.location.search).get("view") === "sent" && data.some(item => item.Value === 3)
            ? 3 : data[0].Value);
        setHasLoaded(true);
      };
      fetchData();
    }
  }, [user, hasLoaded, router]);

  const selectedTitle = menuItems.find((item) => item.id === selectedMenu)?.title || "فهرست تحقیقات";

  if (Number(user?.PostId) === 50) return <DirectorV2Inbox />;
  // The authorized Setad research chief and specialists use one shared view.
  // All API/SQL actions independently enforce PostActionPermission + Mahal=1.
  if (Number(user?.Mahal) === 1 && [2, 5].includes(Number(user?.PostId))) return <SetadInboxClient />;

  return (
    <div className="research-manage-page">
      <div className="research-manage-topbar">
        <Breadcrumbkhabar
          items={[
            { label: "داشبورد", href: "/Dashboard", icon: <Home className="w-4 h-4" /> },
            { label: "فهرست اشخاص", href: "/Davtalab/CardDavtalab", icon: <User className="w-4 h-4" /> },
            { label: "مدیریت تحقیقات", icon: <Newspaper className="w-4 h-4" /> },
          ]}
        />

        <div className="research-manage-downloads">
          <a href="/PDF/FormTahghighat.pdf" download className="research-manage-download-button">
            <Download size={16} />
            <span>فرم‌های تحقیق</span>
          </a>
          <a href="/PDF/MeryarTahghighat.pdf" download className="research-manage-download-button secondary">
            <Download size={16} />
            <span>مصادیق سوالات کاربرگ تحقیق</span>
          </a>
        </div>
      </div>

      <section className={`research-manage-workspace ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <aside className="research-manage-sidebar">
          <div className="research-manage-sidebar-header">
            {isSidebarOpen && (
              <div className="research-manage-sidebar-title-wrap">
                <span className="research-manage-sidebar-mark" aria-hidden="true" />
                <div>
                  <h2>مدیریت تحقیقات</h2>
                  <span>کارتابل پرونده‌ها</span>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="research-manage-sidebar-toggle"
              title={isSidebarOpen ? "بستن فهرست" : "باز کردن فهرست"}
              aria-label={isSidebarOpen ? "بستن فهرست" : "باز کردن فهرست"}
            >
              <Menu size={19} />
            </button>
          </div>

          <div className="research-manage-menu">
            {menuItems.map((item) => {
              const active = selectedMenu === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedMenu(item.id)}
                  className={`research-manage-menu-item ${active ? "active" : ""}`}
                  title={!isSidebarOpen ? item.title : undefined}
                >
                  <span className="research-manage-menu-main">
                    <span className="research-manage-menu-icon">{item.icon}</span>
                    {isSidebarOpen && <span className="research-manage-menu-label">{item.title}</span>}
                  </span>
                  <span className="research-manage-menu-count">{item.count}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <div className="research-manage-content">
          <div className="research-manage-content-header">
            <div className="research-manage-content-title">
              <span className="research-manage-content-dot" aria-hidden="true" />
              <span>{selectedTitle}</span>
            </div>
          </div>

          <div className="research-manage-content-body">
            {selectedMenu !== null ? (
              <Kartabl
                codeentekhabat={31210}
                mahalreciver={mahal}
                erjastate={selectedMenu}
                idValue={selectedMenu}
                amarData={amarData}
              />
            ) : (
              <div className="research-manage-empty">موردی برای نمایش وجود ندارد</div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
