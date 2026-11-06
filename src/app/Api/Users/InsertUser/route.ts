import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAdminAccess } from "@/lib/adminAccess";
import { isMahalInScope } from "@/lib/userScope";

const validId = (value: unknown) => {
  const text = String(value ?? "").trim();
  const n = Number(text);
  return /^\d+$/.test(text) && Number.isSafeInteger(n) && n > 0 ? n : null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { actor, isAdmin: actorAdmin, pool } = await getAdminAccess(req.cookies.get("token")?.value);
    const userId = validId(body.userId), personId = validId(body.personId), postId = validId(body.postId), mahal = validId(body.mahal);
    const password = String(body.password ?? "").trim();
    if (!userId || !personId || !postId || !mahal || !password)
      return NextResponse.json({ status: 400, error: "اطلاعات کاربر کامل نیست." }, { status: 400 });
    if (!isMahalInScope(actor.mahal, mahal)) throw new Error("FORBIDDEN");
    if (body.isAdmin !== undefined && (typeof body.isAdmin !== "boolean" || !actorAdmin)) throw new Error("FORBIDDEN");
    const grantAdmin = actorAdmin && body.isAdmin === true;

    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const exists = await new sql.Request(tx).input("UserId", sql.BigInt, userId)
        .query("SELECT TOP(1) UserId FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@UserId");
      if (exists.recordset?.length) { const e = new Error("EXISTS"); throw e; }
      await new sql.Request(tx)
        .input("UserId", sql.BigInt, userId).input("PersonId", sql.BigInt, personId)
        .input("PostId", sql.Int, postId).input("Mahal", sql.Int, mahal)
        .input("Password", sql.NVarChar(200), password).input("CreateUserId", sql.BigInt, actor.userId)
        .execute("Users.SP_InsertUser");
      // The existing procedure handles mail groups; set the privilege in the same transaction.
      const updated = await new sql.Request(tx).input("UserId", sql.BigInt, userId)
        .input("IsAdmin", sql.Bit, grantAdmin)
        .query("UPDATE dbo.Users SET IsAdmin=@IsAdmin WHERE UserId=@UserId");
      if (!updated.rowsAffected?.[0]) throw new Error("INSERT_FAILED");
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
    return NextResponse.json({ status: 200, saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "EXISTS" ? 409 : 500;
    return NextResponse.json({ status, error: status === 403 ? "اجازه افزودن کاربر یا اعطای دسترسی مدیر را ندارید." :
      status === 409 ? "این شناسه کاربری قبلاً ثبت شده است." : status === 401 ? "نشست نامعتبر است." : "خطا در ثبت کاربر." }, { status });
  }
}
