import HamkariClient from "../../HamkariClient";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  const id = Number(personId);
  if (!Number.isSafeInteger(id) || id <= 0) {
    return <div dir="rtl" style={{ padding: 24 }}>شناسه شخص نامعتبر است.</div>;
  }
  return <HamkariClient profilePersonId={id} />;
}
