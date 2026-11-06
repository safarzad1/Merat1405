import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { ChatError, currentChatUser, idOf } from "@/lib/meratChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await currentChatUser(req);
    const id = idOf(req.nextUrl.searchParams.get("id"));
    const pool = await getConnection();
    const result = await pool.request().input("Id", sql.BigInt, id).input("Me", sql.BigInt, user.userId)
      .query(`SELECT A.FileData, M.MimeType, M.OriginalFileName
        FROM Chat.Attachments A JOIN Chat.Messages M ON M.ID=A.MessageId
        JOIN Chat.Conversations C ON C.ID=M.ConversationId
        WHERE M.ID=@Id AND (C.UserId1=@Me OR C.UserId2=@Me)`);
    const item = result.recordset[0] as { FileData: Buffer; MimeType: string; OriginalFileName: string } | undefined;
    if (!item) throw new ChatError("پیوست یافت نشد یا دسترسی مجاز نیست.", 404);
    const mime = String(item.MimeType || "application/octet-stream").toLowerCase();
    const inline = /^(image\/(jpeg|png|gif|webp)|audio\/(mpeg|wav|ogg|webm)|video\/(mp4|webm)|application\/pdf)$/.test(mime);
    const fileName = String(item.OriginalFileName || "attachment").replace(/[\r\n\\/"]/g, "_");
    return new NextResponse(new Uint8Array(item.FileData), {
      headers: {
        "Content-Type": inline ? mime : "application/octet-stream",
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="download"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    const status = error instanceof ChatError ? error.status : 500;
    if (status === 500) console.error("Merat chat attachment", error);
    return NextResponse.json({ success: false, message: error instanceof ChatError ? error.message : "خطای دریافت فایل." }, { status });
  }
}
