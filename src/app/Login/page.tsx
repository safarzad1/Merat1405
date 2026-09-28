import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Image from "next/image";
import LoginForm from "./LoginForm";
import styles from "./Login.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const cookieStore = await cookies();
  const hasToken = Boolean(cookieStore.get("token")?.value);
  const hasSession = cookieStore.get("merat-new-session")?.value === "1";
  if (hasToken && hasSession) redirect("/Dashboard");

  return (
    <main className={styles.page} dir="rtl">
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.pageGlowOne} aria-hidden="true" />
      <div className={styles.pageGlowTwo} aria-hidden="true" />
      <div className={styles.pageGrid} aria-hidden="true" />

      <section className={styles.authModal} aria-labelledby="login-title">
        <section className={styles.loginPanel}>
          <div className={styles.formGlowTop} aria-hidden="true" />
          <div className={styles.formGlowBottom} aria-hidden="true" />

          <div className={styles.loginContent}>
            <div className={styles.mobileBrand}>
              <span aria-hidden="true">م</span>
              سامانه مرآت
            </div>

            <header className={styles.loginHeading}>
              <span className={styles.eyebrow}>خوش آمدید</span>
              <h2 id="login-title">ورود به سامانه مرآت</h2>
              <p>برای ادامه، اطلاعات حساب کاربری خود را وارد کنید.</p>
            </header>

            <LoginForm />

            <footer className={styles.version}>
              اداره کل فناوری اطلاعات و ارتباطات
            </footer>
          </div>
        </section>

        <aside className={styles.brandPanel} aria-label="تصویر سامانه مرآت">
          <Image
            src="/pic-input.jpg"
            alt=""
            fill
            priority
            sizes="(max-width: 900px) 0px, 50vw"
            className={styles.brandFullImage}
          />
        </aside>
      </section>
    </main>
  );
}
