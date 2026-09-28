import PanelPage from "@/component/PanelPage";
import MailShell from "@/component/Mail/MailShell";

export default function MailLayout({ children }: { children: React.ReactNode }) {
  return <PanelPage title="صندوق پستی"><MailShell>{children}</MailShell></PanelPage>;
}
