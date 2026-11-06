import PanelPage from "@/component/PanelPage";
import ChatWorkspace from "@/component/MeratChat/ChatWorkspace";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <PanelPage title="پیام‌رسان">
      <ChatWorkspace />
    </PanelPage>
  );
}
