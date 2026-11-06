import { createHmac } from "node:crypto";
import http from "node:http";
import sql, { type ConnectionPool } from "mssql";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getConnection } from "@/lib/db";

export type ChatPerson = { userId: number; fullName: string; postTitle: string };
export class ChatError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const idOf = (v: unknown) => {
  const value = Number(v);
  if (!Number.isSafeInteger(value) || value < 1) throw new ChatError("شناسه معتبر نیست.");
  return value;
};

export async function currentChatUser(req: NextRequest): Promise<ChatPerson> {
  if (req.cookies.get("merat-new-session")?.value !== "1") {
    throw new ChatError("برای استفاده از پیام‌رسان وارد سامانه شوید.", 401);
  }
  const token = req.cookies.get("token")?.value;
  if (!token) throw new ChatError("نشست معتبر نیست.", 401);
  let userId = 0;
  try {
    const payload = verifyToken(token) as { userId?: string | number };
    userId = idOf(payload.userId);
  } catch { throw new ChatError("نشست منقضی شده است؛ دوباره وارد شوید.", 401); }
  const pool = await getConnection();
  const result = await pool.request().input("UserId", sql.BigInt, userId).query(`
    SELECT U.UserId AS userId,
      COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(P.FirstName, N' ', P.LastName))), N''), CONVERT(NVARCHAR(30), U.UserId)) AS fullName,
      COALESCE(PS.OnvanPost, N'همکار') AS postTitle
    FROM dbo.Users U
    LEFT JOIN dbo.Person P ON P.PersonId=U.PersonId
    LEFT JOIN dbo.Posts PS ON PS.PostId=U.PostId
    WHERE U.UserId=@UserId AND ISNULL(U.IsActive, 0)=1
  `);
  const user = result.recordset[0] as ChatPerson | undefined;
  if (!user) throw new ChatError("کاربر فعال یافت نشد.", 403);
  return { userId: Number(user.userId), fullName: String(user.fullName), postTitle: String(user.postTitle) };
}

export async function assertConversation(pool: ConnectionPool, conversationId: number, userId: number) {
  const result = await pool.request()
    .input("Id", sql.BigInt, conversationId)
    .input("UserId", sql.BigInt, userId)
    .query("SELECT ID FROM Chat.Conversations WHERE ID=@Id AND (UserId1=@UserId OR UserId2=@UserId)");
  if (!result.recordset.length) throw new ChatError("دسترسی به گفتگو مجاز نیست.", 403);
}

export async function getUsers(userId: number, search: string) {
  const pool = await getConnection();
  const found = await pool.request()
    .input("UserId", sql.BigInt, userId)
    .input("Search", sql.NVarChar(200), `%${search.slice(0, 150).replace(/[%_\[]/g, " ")}%`)
    .query(`SELECT TOP (80) U.UserId AS userId,
      COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(P.FirstName, N' ', P.LastName))), N''), CONVERT(NVARCHAR(30), U.UserId)) AS fullName,
      COALESCE(PS.OnvanPost, N'همکار') AS postTitle
      FROM dbo.Users U LEFT JOIN dbo.Person P ON P.PersonId=U.PersonId
      LEFT JOIN dbo.Posts PS ON PS.PostId=U.PostId
      WHERE U.UserId<>@UserId AND ISNULL(U.IsActive, 0)=1
        AND (LTRIM(RTRIM(CONCAT(P.FirstName, N' ', P.LastName))) LIKE @Search OR CONVERT(NVARCHAR(30), U.UserId) LIKE @Search)
      ORDER BY P.LastName, P.FirstName, U.UserId`);
  return found.recordset;
}

export async function startConversation(userId: number, targetUserId: number) {
  if (userId === targetUserId) throw new ChatError("نمی‌توانید به خودتان پیام دهید.");
  const [a, b] = [Math.min(userId, targetUserId), Math.max(userId, targetUserId)];
  const pool = await getConnection();
  const result = await pool.request()
    .input("Me", sql.BigInt, userId)
    .input("A", sql.BigInt, a)
    .input("B", sql.BigInt, b)
    .query(`SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      IF NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserId=@B AND ISNULL(IsActive,0)=1)
         OR NOT EXISTS(SELECT 1 FROM dbo.Users WHERE UserId=@A AND ISNULL(IsActive,0)=1)
      BEGIN ROLLBACK TRANSACTION; THROW 51000, 'Chat user not active', 1; END;
      IF NOT EXISTS (SELECT 1 FROM Chat.Conversations WITH (UPDLOCK, HOLDLOCK) WHERE UserId1=@A AND UserId2=@B)
         INSERT INTO Chat.Conversations (UserId1, UserId2) VALUES (@A, @B);
      SELECT ID AS conversationId FROM Chat.Conversations WHERE UserId1=@A AND UserId2=@B;
      COMMIT TRANSACTION;`);
  return Number(result.recordset[0]?.conversationId ?? 0);
}

export async function conversationsFor(userId: number) {
  const pool = await getConnection();
  const result = await pool.request().input("Me", sql.BigInt, userId).query(`
    SELECT TOP (100) C.ID AS conversationId,
      U.UserId AS otherUserId,
      COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(P.FirstName, N' ', P.LastName))), N''), CONVERT(NVARCHAR(30), U.UserId)) AS fullName,
      COALESCE(PS.OnvanPost, N'همکار') AS postTitle,
      COALESCE(M.MessageText, CASE WHEN M.MessageType <> N'text' THEN N'پیوست' ELSE N'' END, N'') AS lastMessage,
      C.LastActivityAt AS lastAt,
      (SELECT COUNT_BIG(*) FROM Chat.Messages NM WHERE NM.ConversationId=C.ID AND NM.SenderUserId<>@Me AND NM.IsRead=0) AS unread
    FROM Chat.Conversations C
    JOIN dbo.Users U ON U.UserId=CASE WHEN C.UserId1=@Me THEN C.UserId2 ELSE C.UserId1 END
    LEFT JOIN dbo.Person P ON P.PersonId=U.PersonId
    LEFT JOIN dbo.Posts PS ON PS.PostId=U.PostId
    LEFT JOIN Chat.Messages M ON M.ID=C.LastMessageId
    WHERE C.UserId1=@Me OR C.UserId2=@Me
    ORDER BY C.LastActivityAt DESC, C.ID DESC`);
  return result.recordset;
}

export async function messagesFor(conversationId: number, userId: number) {
  const pool = await getConnection();
  await assertConversation(pool, conversationId, userId);
  const result = await pool.request()
    .input("Id", sql.BigInt, conversationId)
    .input("Me", sql.BigInt, userId)
    .query(`SELECT * FROM (
      SELECT TOP (150) M.ID AS id, M.ConversationId AS conversationId, M.SenderUserId AS senderUserId,
        M.MessageText AS messageText, M.MessageType AS messageType,
        M.OriginalFileName AS originalFileName, M.MimeType AS mimeType, M.FileSize AS fileSize,
        M.IsRead AS isRead, M.CreatedAt AS createdAt, M.ReadAt AS readAt,
        CASE WHEN M.SenderUserId=@Me THEN CAST(1 AS BIT) ELSE CAST(0 AS BIT) END AS isMine
      FROM Chat.Messages M WHERE M.ConversationId=@Id ORDER BY M.ID DESC
    ) A ORDER BY A.id ASC`);
  return result.recordset;
}

export async function unreadFor(userId: number) {
  const pool = await getConnection();
  const result = await pool.request().input("Me", sql.BigInt, userId).query(`
    SELECT COUNT_BIG(*) AS unread FROM Chat.Messages M
    JOIN Chat.Conversations C ON C.ID=M.ConversationId
    WHERE (C.UserId1=@Me OR C.UserId2=@Me) AND M.SenderUserId<>@Me AND M.IsRead=0`);
  return Number(result.recordset[0]?.unread || 0);
}

export async function markRead(conversationId: number, userId: number): Promise<boolean> {
  const pool = await getConnection();
  await assertConversation(pool, conversationId, userId);
  const updated = await pool.request().input("Id", sql.BigInt, conversationId).input("Me", sql.BigInt, userId)
    .query(`UPDATE Chat.Messages SET IsRead=1, ReadAt=SYSUTCDATETIME()
      WHERE ConversationId=@Id AND SenderUserId<>@Me AND IsRead=0`);
  return (updated.rowsAffected[0] ?? 0) > 0;
}

export type NewMessage = {
  conversationId: number;
  senderId: number;
  messageText: string;
  upload?: { data: Buffer; originalName: string; mime: string; type: "image" | "audio" | "video" | "file" };
};

export async function sendMessage(payload: NewMessage) {
  const pool = await getConnection();
  await assertConversation(pool, payload.conversationId, payload.senderId);
  if (!payload.messageText && !payload.upload) throw new ChatError("پیام یا فایل را وارد کنید.");
  if (payload.messageText.length > 2000) throw new ChatError("پیام بیش از ۲۰۰۰ حرف است.");
  const transaction = new sql.Transaction(pool);
  await transaction.begin();
  try {
    const r = await new sql.Request(transaction)
      .input("ConversationId", sql.BigInt, payload.conversationId)
      .input("Me", sql.BigInt, payload.senderId)
      .input("Text", sql.NVarChar(2000), payload.messageText)
      .input("Type", sql.NVarChar(20), payload.upload?.type ?? "text")
      .input("FileName", sql.NVarChar(260), payload.upload?.originalName ?? null)
      .input("Mime", sql.NVarChar(150), payload.upload?.mime ?? null)
      .input("Size", sql.BigInt, payload.upload?.data.length ?? null)
      .query(`INSERT INTO Chat.Messages (ConversationId,SenderUserId,MessageText,MessageType,OriginalFileName,MimeType,FileSize)
        OUTPUT INSERTED.ID AS id VALUES (@ConversationId,@Me,@Text,@Type,@FileName,@Mime,@Size)`);
    const messageId = Number(r.recordset[0]?.id);
    if (payload.upload) {
      await new sql.Request(transaction)
        .input("MessageId", sql.BigInt, messageId)
        .input("Bytes", sql.VarBinary(sql.MAX), payload.upload.data)
        .query("INSERT INTO Chat.Attachments (MessageId,FileData) VALUES (@MessageId,@Bytes)");
    }
    await new sql.Request(transaction)
      .input("ConversationId", sql.BigInt, payload.conversationId)
      .input("MessageId", sql.BigInt, messageId)
      .query(`UPDATE Chat.Conversations SET LastMessageId=@MessageId, LastActivityAt=SYSUTCDATETIME() WHERE ID=@ConversationId`);
    await transaction.commit();
    return messageId;
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  }
}

// Signal only: broadcasts no text, identity or conversation IDs. Authenticated clients refetch from SQL.
export async function signalChatChange() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return;
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret).update(timestamp).digest("hex");
  await new Promise<void>((resolve) => {
    const portValue = Number(process.env.SOCKET_PORT || "3001");
    const socketPort = Number.isSafeInteger(portValue) && portValue >= 1 && portValue <= 65535 ? portValue : 3001;
    const req = http.request({ host: "127.0.0.1", port: socketPort, path: "/internal/chat-notify", method: "POST", timeout: 800,
      headers: { "x-merat-time": timestamp, "x-merat-sign": signature, "Content-Length": "0" } }, (res) => { res.resume(); res.on("end", resolve); });
    req.on("error", resolve);
    req.on("timeout", () => { req.destroy(); resolve(); });
    req.end();
  });
}
