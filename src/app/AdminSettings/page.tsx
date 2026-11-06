import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import PanelPage from "@/component/PanelPage";
import { getAdminAccess } from "@/lib/adminAccess";
import Link from "next/link";
import SetadNewsSettingsClient from "@/app/AkhbarManage/Settings/SetadNewsSettingsClient";
import NewsWorkflowAudit from "./NewsWorkflowAudit";
import NewsReassignment from "./NewsReassignment";
import NewsAgingDashboard from "./NewsAgingDashboard";
import NewsOverdueManagement from "./NewsOverdueManagement";
import styles from "./AdminSettings.module.css";

export const dynamic = "force-dynamic";

type TabKey = "news" | "research" | "users" | "regions" | "general";
const tabs: { id: TabKey; name: string; description: string }[] = [
  { id: "news", name: "اخبار", description: "دسترسی و استان‌های کارشناسان ستاد" },
  { id: "research", name: "تحقیقات", description: "تنظیمات مدیریتی تحقیقات" },
  { id: "users", name: "کاربران و دسترسی‌ها", description: "مجوزها و تنظیمات سازمانی کاربران" },
  { id: "regions", name: "تقسیمات کشوری", description: "استان، حوزه انتخابیه و شهرستان" },
  { id: "general", name: "عمومی", description: "سایر تنظیمات کل سامانه" },
];

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token || cookieStore.get("merat-new-session")?.value !== "1") redirect("/Login");

  let isAdmin = false;
  try {
    isAdmin = (await getAdminAccess(token)).isAdmin;
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") redirect("/Login");
    throw error;
  }
  if (!isAdmin) notFound();

  const requested = (await searchParams).tab;
  const requestedTab = typeof requested === "string" ? requested : "news";
  const selected = tabs.find((tab) => tab.id === requestedTab) ?? tabs[0];

  return (
    <PanelPage title="تنظیمات مدیریت سامانه">
      <div className={styles.settings} dir="rtl">
        <header className={styles.intro}>
          <div>
            <h1>تنظیمات مدیریت سامانه</h1>
            <p>تنظیمات مستقل هر بخش مرآت از طریق تب‌های زیر مدیریت می‌شود.</p>
          </div>
        </header>
        <nav className={styles.tabs} aria-label="بخش‌های اصلی تنظیمات مدیریت سامانه">
          {tabs.map((tab) => (
            <Link key={tab.id} href={`/AdminSettings?tab=${tab.id}`}
              className={`${styles.tab} ${selected.id === tab.id ? styles.selected : ""}`}
              aria-current={selected.id === tab.id ? "page" : undefined}>
              {tab.name}
            </Link>
          ))}
        </nav>
        <section className={styles.content} aria-label={`تنظیمات ${selected.name}`}>
          {selected.id === "news" ? (
            <><SetadNewsSettingsClient /><NewsAgingDashboard /><NewsOverdueManagement /><NewsReassignment /><NewsWorkflowAudit /></>
          ) : (
            <div className={styles.comingSoon}>
              <h2>تنظیمات {selected.name}</h2>
              <p>{selected.description}</p>
              <p>ساختار این بخش آماده است. گزینه‌های مدیریتی آن پس از تعریف نیازمندی‌های مربوط به این بخش اضافه خواهند شد.</p>
              {selected.id === "general" ? (
                <p>تنظیمات شخصیِ ظاهر سامانه در حال حاضر از بخش <Link href="/Theme">تنظیم تم</Link> در دسترس است.</p>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </PanelPage>
  );
}
