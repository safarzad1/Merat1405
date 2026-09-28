import PanelPage from "@/component/PanelPage";
import styles from "./AkhbarManage.module.css";

export const dynamic = "force-dynamic";

export default function AkhbarManagePage() {
  return (
    <PanelPage title="مدیریت اخبار">
      <div className={styles.pageBody}>
        <section className={styles.newsWorkspace} aria-label="مدیریت اخبار">
          <header className={styles.workspaceHeader}>
            <span className={styles.headerIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5 4h11v16H5z" />
                <path d="M16 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h3" />
              </svg>
            </span>
            <div>
              <h1>مدیریت اخبار</h1>
              <p>ثبت و مدیریت اخبار سامانه</p>
            </div>
          </header>

          <div className={styles.contentArea} />
        </section>
      </div>
    </PanelPage>
  );
}
