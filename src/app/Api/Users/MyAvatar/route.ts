import { NextRequest, NextResponse } from "next/server";
import { authenticatedUserId, requireSameOrigin } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const reply = (status: number, message: string) =>
  NextResponse.json({ ok: false, message }, { status, headers });

async function userIdOrNull() {
  try { return await authenticatedUserId(); }
  catch { return null; }
}

/** Photos are scoped to the signed-in account; no UserId/username comes from the browser. */
export async function GET() {
  const userId = await userIdOrNull();
  if (!userId) return reply(401, "نشست معتبر نیست.");
  try {
    const pool = await getMeratPool();
    const result = await pool.request().input("UserId", sql.BigInt, userId)
      .query("SELECT TOP (1) PhotoJpeg FROM dbo.UserAvatar WHERE UserId=@UserId");
    let bytes = result.recordset?.[0]?.PhotoJpeg as Buffer | undefined;
    let mime = "image/jpeg";

    // Read-only compatibility with older installations storing pictures in PersonFiles.
    if (!bytes) {
      try {
        const user = await pool.request().input("UserId", sql.BigInt, userId)
          .query("SELECT TOP (1) p.CodeMelli FROM dbo.Users u INNER JOIN dbo.Person p ON p.PersonId=u.PersonId WHERE u.UserId=@UserId AND u.IsActive=1");
        const username = String(user.recordset?.[0]?.CodeMelli || "").trim();
        if (username.length === 10) {
          const legacy = await pool.request().input("UserName", sql.NChar(10), username)
            .execute("dbo.SP_GetPersonPic");
          bytes = legacy.recordset?.[0]?.Files as Buffer | undefined;
          if (bytes?.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) mime = "image/png";
          else if (bytes?.toString("ascii",0,4) === "RIFF" && bytes.toString("ascii",8,12) === "WEBP") mime = "image/webp";
        }
      } catch { /* PersonFiles/legacy procedure is optional. */ }
    }
    if (!bytes || bytes.length < 45) return reply(404, "هنوز تصویر پروفایل ثبت نشده است.");
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: { ...headers, "Content-Type": mime, "Content-Disposition": "inline; filename=profile.jpg" },
    });
  } catch(error) {
    console.error("MyAvatar GET", error);
    return reply(500, "دریافت تصویر پروفایل ممکن نیست؛ نصب SQL مربوط را بررسی کنید.");
  }
}

export async function POST(req: NextRequest) {
  const userId = await userIdOrNull();
  if (!userId) return reply(401, "برای تغییر تصویر پروفایل وارد حساب شوید.");
  try { requireSameOrigin(req); }
  catch { return reply(403, "مبدأ درخواست معتبر نیست."); }
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_PHOTO_BYTES + 100000) return reply(413, "حجم تصویر زیاد است.");
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
    return reply(415, "نوع درخواست تصویر معتبر نیست.");
  try {
    const form = await req.formData();
    const file = form.get("photo");
    if (!(file instanceof File) || file.type !== "image/jpeg" || file.size < 100 || file.size > MAX_PHOTO_BYTES)
      return reply(400, "فقط تصویر JPEG تا ۲ مگابایت پذیرفته می‌شود.");
    const bytes = Buffer.from(await file.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes.at(-2) !== 0xff || bytes.at(-1) !== 0xd9)
      return reply(400, "ساختار تصویر JPEG معتبر نیست.");
    const pool = await getMeratPool();
    await pool.request().input("UserId", sql.BigInt, userId)
      .input("PhotoJpeg", sql.VarBinary(sql.MAX), bytes)
      .query(`
        SET XACT_ABORT ON;
        BEGIN TRANSACTION;
        IF NOT EXISTS (SELECT 1 FROM dbo.Users WITH (UPDLOCK) WHERE UserId=@UserId AND IsActive=1)
          THROW 53140, N'حساب کاربری فعال نیست.', 1;
        IF EXISTS (SELECT 1 FROM dbo.UserAvatar WITH (UPDLOCK, HOLDLOCK) WHERE UserId=@UserId)
          UPDATE dbo.UserAvatar SET PhotoJpeg=@PhotoJpeg,UpdatedAtUtc=SYSUTCDATETIME() WHERE UserId=@UserId;
        ELSE
          INSERT dbo.UserAvatar(UserId,PhotoJpeg) VALUES(@UserId,@PhotoJpeg);
        COMMIT TRANSACTION;
      `);
    // Keep legacy PersonFiles-based person cards consistent where the old DB still exists.
    // Failure here never rolls back the authoritative photo stored in MeratDB.
    try {
      const user = await pool.request().input("UserId", sql.BigInt, userId)
        .query("SELECT TOP (1) p.CodeMelli FROM dbo.Users u INNER JOIN dbo.Person p ON p.PersonId=u.PersonId WHERE u.UserId=@UserId AND u.IsActive=1");
      const username = String(user.recordset?.[0]?.CodeMelli || "").trim();
      if (username.length === 10) {
        await pool.request().input("UserName", sql.NChar(10), username)
          .input("Files", sql.VarBinary(sql.MAX), bytes)
          .input("UserId", sql.BigInt, userId)
          .execute("dbo.SP_InsertPersonPic");
      }
    } catch { /* Legacy photo store is optional, may be unavailable on migrated databases. */ }
    return NextResponse.json({ ok: true, message: "تصویر پروفایل ذخیره شد." }, { headers });
  } catch(error) {
    console.error("MyAvatar POST", error);
    return reply(500, "ذخیره تصویر پروفایل انجام نشد؛ SQL جدول UserAvatar را بررسی کنید.");
  }
}
