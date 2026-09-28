"use client";

import { useEffect, useState } from "react";
import { useMeratUser } from "@/lib/useMeratUser";
import { Inbox, Send, FileText, Trash2, Menu, User, Download } from "@/component/ResearchIcons";
import { Home, Newspaper } from "@/component/ResearchIcons";
import Kartabl from "./Kartabl";
import Breadcrumbkhabar from '@/component/Breadcrumb/Breadcrumb';
import { Get_AmarTahghight_Shahrestan } from '@/services/ApiService';
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

// تایپ آیتم منو

interface MenuItem {
  id: number;
  title: string;
  icon: ReactNode;
  color: string;
  count: number;
}


// تابع برای گرفتن آیکن بر اساس Value
const getIcon = (item?: AmarItem) => {
  if (!item) return <Inbox size={18} />; // پیش‌فرض
  switch (item.Value) {
    case 1: return <Inbox size={18} />;
    case 2: return <FileText size={18} />;
    case 3: return <Send size={18} />;
    case 4: return <Trash2 size={18} />;
    case 5: return <Send size={18} />; // یا هر چیزی که میخواید
    default: return <Inbox size={18} />;
  }
};

export default function MailLayout() {

  const user = useMeratUser();
  const router = useRouter();

  const [amarData, setAmarData] = useState<AmarItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<number | null>(null);
  const [Mahal, setMahal] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);


  const getColor = () => "text-blue-500";


  useEffect(() => {
    if (!hasLoaded && user?.Mahal) {
      const fetchData = async () => {
        const result = await Get_AmarTahghight_Shahrestan(user.Mahal, user.UserId);
        if (result.status === 401) {
          router.push("/Login");
        }
        const data: AmarItem[] = result.data || [];
        setAmarData(data);

        const newMenuItems: MenuItem[] = (data || []).map((item: AmarItem) => ({
          id: item.Value,
          title: item.NameFarsi,
          icon: getIcon(item),
          color: getColor(),
          count: item.CountParvandeh,
        }));

        setMenuItems(newMenuItems);

        if (data.length > 0) setSelectedMenu(data[0].Value);

        setHasLoaded(true);
      };
      fetchData();
    }
  }, [user, hasLoaded]);

  return (
    <>
      <div className="bg-sky-200 rounded py-2 px-10 flex justify-between items-center">
        <Breadcrumbkhabar
          items={[
            { label: "داشبورد", href: "/Dashboard", icon: <Home className="w-4 h-4" /> },
            { label: "فهرست اشخاص", href: "/Davtalab/CardDavtalab", icon: <User className="w-4 h-4" /> },
            { label: "مدیریت تحقیقات", icon: <Newspaper className="w-4 h-4" /> },
          ]}
        />

        <div className="flex gap-1">
          <a
            href="/PDF/FormTahghighat.pdf"
            download
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-2xl flex items-center gap-2 transition duration-300"
          >
            <Download className="w-4 h-4" />
            فرم های تحقیق
          </a>
          <a
            href="/PDF/MeryarTahghighat.pdf"
            download
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-2xl flex items-center gap-2 transition duration-300"
          >
            <Download className="w-4 h-4" />
            مصادیق سوالات کاربرگ تحقیق
          </a>
        </div>
      </div>

      <div className="mx-2 my-2 overflow-hidden">
        <div className="flex rounded-2xl shadow-lg overflow-hidden">

          <div className={`bg-white transition-all duration-300 shadow-sm flex flex-col  ${isSidebarOpen ? "w-65" : "w-14"}`}>
            <div className="flex items-center justify-between px-3 h-12 border-b">
              {isSidebarOpen && <h2 className="text-xs text-black text-[17px]">مدیریت تحقیقات</h2>}
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-1 rounded text-black hover:bg-blue-100 hover:text-black transition cursor-pointer"
              >
                <Menu size={18} />
              </button>
            </div>

            <div className="flex-1 py-2 space-y-1 px-1 overflow-y-auto">
              {menuItems.map((item: MenuItem) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedMenu(item.id)}
                  className={`flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-all ${selectedMenu === item.id ? "bg-indigo-100 text-indigo-700 shadow-sm cursor-pointer" : "hover:bg-gray-50 text-gray-700 cursor-pointer"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`${item.color}`}>{item.icon}</span>
                    {isSidebarOpen && <span>{item.title}</span>}
                  </div>
                  <div className={`shrink-0 bg-green-700 text-white rounded-full px-2 py-0.5 ${isSidebarOpen ? "" : "ml-1"}`}>
                    {item.count}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-l-2xl flex flex-col overflow-hidden">
            <div className="text-black border-b h-12 flex items-center px-5 capitalize shadow-sm">
              {menuItems.find((m) => m.id === selectedMenu)?.title}
            </div>

            <div className="flex-1 overflow-y-auto">
              {selectedMenu !== null ? (
                <Kartabl
                  codeentekhabat={31210}
                  mahalreciver={Mahal}
                  erjastate={selectedMenu}
                  idValue={selectedMenu}
                  amarData={amarData}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                  موردی برای نمایش وجود ندارد
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
