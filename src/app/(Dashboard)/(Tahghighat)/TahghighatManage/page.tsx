"use client";

import { useEffect, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { Inbox, Send, FileText, Trash2, Menu, User, Download } from "@/component/ResearchIcons";
import { Home, Newspaper } from "@/component/ResearchIcons";
import Kartabl from "./Kartabl";
import Breadcrumbkhabar from "@/component/Breadcrumb/Breadcrumb";
import { Get_AmarTahghight_Shahrestan } from "@/services/ApiService";
import { ReactNode } from "react";
import { useRouter } from "next/navigation";

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
      const fetchData = async () => {
        const result = await Get_AmarTahghight_Shahrestan(user.Mahal, user.UserId);
        if (result.status === 401) {
          router.push("/Login");
          return;
        }

        const data: AmarItem[] = result.data || [];
        setAmarData(data);
        const newMenuItems: MenuItem[] = data.map((item) => ({
          id: item.Value,
          title: item.NameFarsi,
          icon: getIcon(item),
          count: item.CountParvandeh,
        }));
        setMenuItems(newMenuItems);
        if (data.length > 0) setSelectedMenu(data[0].Value);
        setHasLoaded(true);
      };
      fetchData();
    }
  }, [user, hasLoaded, router]);

  const selectedTitle = menuItems.find((item) => item.id === selectedMenu)?.title || "فهرست تحقیقات";

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
