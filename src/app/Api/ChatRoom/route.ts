import { NextRequest, NextResponse } from "next/server";
import {
  ChatError, currentChatUser, getUsers, startConversation, conversationsFor,
  messagesFor, unreadFor, markRead, sendMessage, signalChatChange, idOf,
} from "@/lib/meratChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function reply<T>(data: T) {
  return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
}
function fail(error: unknown) {
  const status = error instanceof ChatError ? error.status : 500;
  if (status >= 500) console.error("Merat ChatRoom", error);
  return NextResponse.json({ success: false, message: error instanceof ChatError ? error.message : "خطا در سرویس پیام‌رسان." }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(req: NextRequest) {
  try {
    const user = await currentChatUser(req);
    const mode = req.nextUrl.searchParams.get("mode") ?? "conversations";
    if (mode === "me") return reply(user);
    if (mode === "users") return reply(await getUsers(user.userId, req.nextUrl.searchParams.get("search") ?? ""));
    if (mode === "conversations") return reply(await conversationsFor(user.userId));
    if (mode === "unread") return reply({ count: await unreadFor(user.userId) });
    if (mode === "messages") return reply(await messagesFor(idOf(req.nextUrl.searchParams.get("id")), user.userId));
    throw new ChatError("درخواست نامعتبر است.");
  } catch (error) { return fail(error); }
}

const allowedMime: Record<string, "image" | "audio" | "video" | "file"> = {
  "image/jpeg": "image", "image/png": "image", "image/gif": "image", "image/webp": "image",
  "audio/mpeg": "audio", "audio/wav": "audio", "audio/ogg": "audio", "audio/webm": "audio",
  "video/mp4": "video", "video/webm": "video", "application/pdf": "file",
  "text/plain": "file", "application/zip": "file",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "file",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "file",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "file",
  "application/msword": "file", "application/vnd.ms-excel": "file",
};

export async function POST(req: NextRequest) {
  try {
    const user = await currentChatUser(req);
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      if (Number(req.headers.get("content-length") || 0) > 9 * 1024 * 1024) throw new ChatError("حجم درخواست بیش از حد مجاز است.", 413);
      const form = await req.formData();
      if (form.get("action") !== "send") throw new ChatError("عملیات نامعتبر است.");
      const conversationId = idOf(form.get("conversationId"));
      const messageText = String(form.get("messageText") ?? "").trim();
      const file = form.get("file");
      if (!(file instanceof File)) throw new ChatError("فایل انتخاب نشده است.");
      const MAX_FILE_BYTES = 8 * 1024 * 1024;
      if (file.size < 1 || file.size > MAX_FILE_BYTES) throw new ChatError("حداکثر حجم فایل ۸ مگابایت است.");
      const messageType = allowedMime[file.type];
      if (!messageType) throw new ChatError("نوع فایل مجاز نیست.");
      const data = Buffer.from(await file.arrayBuffer());
      // Signature verification for displayed image types. Other files are delivered as downloads.
      if (messageType === "image") {
        const jpg = data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
        const png = data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        const gif = data.subarray(0, 3).toString("ascii") === "GIF";
        const webp = data.subarray(0, 4).toString("ascii") === "RIFF" && data.subarray(8, 12).toString("ascii") === "WEBP";
        if (!(jpg && file.type === "image/jpeg") && !(png && file.type === "image/png") && !(gif && file.type === "image/gif") && !(webp && file.type === "image/webp")) {
          throw new ChatError("ساختار فایل تصویری معتبر نیست.");
        }
      }
      const id = await sendMessage({ conversationId, senderId: user.userId, messageText,
        upload: { data, originalName: file.name.slice(0, 260).replace(/[\\/\r\n]/g, "_"), mime: file.type, type: messageType } });
      await signalChatChange();
      return reply({ id });
    }
    if (!contentType.includes("application/json")) throw new ChatError("فرمت درخواست معتبر نیست.");
    const body = await req.json().catch(() => ({}));
    if (body.action === "start") {
      const id = await startConversation(user.userId, idOf(body.otherUserId));
      await signalChatChange();
      return reply({ conversationId: id });
    }
    if (body.action === "read") {
      const changed = await markRead(idOf(body.conversationId), user.userId);
      if (changed) await signalChatChange();
      return reply({ ok: true });
    }
    if (body.action === "send") {
      const text = String(body.messageText ?? "").trim();
      const id = await sendMessage({ conversationId: idOf(body.conversationId), senderId: user.userId, messageText: text });
      await signalChatChange();
      return reply({ id });
    }
    throw new ChatError("عملیات نامعتبر است.");
  } catch (error) { return fail(error); }
}
