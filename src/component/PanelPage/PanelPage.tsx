import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppTopbar from "@/component/AppTopbar";
import { verifyToken } from "@/lib/auth";
import styles from "./PanelPage.module.css";

type SessionPayload = {
  username?: string;
  fullName?: string;
  postId?: number;
};

type PanelPageProps = {
  title: string;
  children?: React.ReactNode;
};

export default async function PanelPage({ title, children }: PanelPageProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  const hasSession = cookieStore.get("merat-new-session")?.value === "1";

  if (!token || !hasSession) redirect("/Login");

  let session: SessionPayload;
  try {
    session = verifyToken(token) as SessionPayload;
  } catch {
    redirect("/Api/Auth/Logout");
  }

  return (
    <div className={styles.page} dir="rtl">
      <AppTopbar
        fullName={session.fullName || session.username}
        postId={Number(session.postId || 0)}
      />
      <main className={styles.main}>
        <div className={styles.breadcrumb}>
          <span>خانه</span>
          <i>/</i>
          <strong>{title}</strong>
        </div>
        <section className={styles.contentSurface} aria-label={title}>
          {children}
        </section>
      </main>
    </div>
  );
}
