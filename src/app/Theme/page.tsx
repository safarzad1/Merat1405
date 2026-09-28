import PanelPage from "@/component/PanelPage";
import ThemeSelector from "./ThemeSelector";

export const dynamic = "force-dynamic";

export default function ThemePage() {
  return (
    <PanelPage title="تنظیم تم">
      <ThemeSelector />
    </PanelPage>
  );
}
