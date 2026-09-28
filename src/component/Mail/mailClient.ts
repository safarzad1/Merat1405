import {
  GetUsersFromGroup,
  InsertMessageFilesMail,
  InsertMessageMail,
  InsertMessageUserMail,
} from "@/services/ApiServiceMail";
import type { MailGroupRow, PickedRecipient } from "./types";

export function isEmptyHtml(html: string) {
  return String(html || "").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length === 0;
}

export async function sendMailMessage(args: {
  subject: string;
  body: string;
  isSend: 0 | 1;
  senderUserId: number;
  selected: PickedRecipient[];
  groups: MailGroupRow[];
  attachments: File[];
}) {
  const { subject, body, isSend, senderUserId, selected, groups, attachments } = args;
  const created: any = await InsertMessageMail(subject, body, isSend, senderUserId);
  if (created?.status === 401) return { status: 401 };
  if (created?.status !== 200) throw new Error(created?.error || created?.message || "خطا در ثبت پیام");

  const messageId = Number(created?.data?.[0]?.MessageId);
  if (!messageId) throw new Error("شناسه پیام دریافت نشد.");
  if (isSend === 0) return { status: 200, messageId };

  const selectedRows = selected.map((x) => groups.find((g) => Number(g.ID) === Number(x.id))).filter(Boolean) as MailGroupRow[];
  const direct: Array<number | string> = [];
  const groupIds: number[] = [];
  for (const row of selectedRows) {
    if (row.UserId !== undefined && row.UserId !== null && String(row.UserId) !== "") direct.push(row.UserId);
    else groupIds.push(Number(row.ID));
  }

  const groupUsers = await Promise.all(groupIds.map(async (id) => {
    try {
      const result: any = await GetUsersFromGroup(id);
      if (result?.status === 401) return [];
      const raw = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : Array.isArray(result?.data?.data) ? result.data.data : [];
      return raw.map((x: any) => x?.UserId).filter((x: any) => x !== undefined && x !== null && String(x) !== "");
    } catch { return []; }
  }));

  const senderKey = String(senderUserId);
  const uniq = new Map<string, number | string>();
  [...direct, ...groupUsers.flat()].forEach((id) => {
    const key = String(id ?? "");
    if (key && key !== senderKey) uniq.set(key, id);
  });
  const recipients = Array.from(uniq.values());
  if (recipients.length === 0) throw new Error("گیرنده معتبری برای ارسال پیام یافت نشد.");

  const results = await Promise.all(recipients.map((recipientId) => InsertMessageUserMail(messageId, senderUserId, recipientId, senderUserId)));
  const failedRecipient = results.some((r: any) => r?.status !== 200);
  if (failedRecipient) throw new Error("ثبت برخی گیرندگان پیام ناموفق بود.");

  if (attachments.length) {
    const fd = new FormData();
    attachments.forEach((file) => fd.append("file", file));
    const uploadRes = await fetch("/Api/UploadFilesMessage", { method: "POST", body: fd, credentials: "include" });
    const uploaded: any = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok || uploaded?.status !== 200) throw new Error(uploaded?.error || "بارگذاری پیوست‌ها ناموفق بود.");
    const files = Array.isArray(uploaded?.files) ? uploaded.files : [];
    for (const file of files) {
      const r: any = await InsertMessageFilesMail(messageId, file.guidName, file.originalName, file.type || "application/octet-stream", senderUserId);
      if (r?.status !== 200) throw new Error("ثبت اطلاعات یکی از پیوست‌ها ناموفق بود.");
    }
  }

  return { status: 200, messageId, recipients: recipients.length };
}
