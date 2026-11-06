import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAdminAccess } from "@/lib/adminAccess";
import { isMahalInScope } from "@/lib/userScope";

const positiveId = (v: unknown) => {
  const text = String(v ?? "").trim();
  const n = Number(text);
  return /^\d+$/.test(text) && Number.isSafeInteger(n) && n > 0 ? n : null;
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const oldId = positiveId(body.oldUserId ?? body.userId), newId = positiveId(body.userId);
    const personId = positiveId(body.personId), postId = positiveId(body.postId);
    if (!oldId || !newId || !personId || !postId)
      return NextResponse.json({ status:400, error:"شناسه و اطلاعات کاربر معتبر نیست." }, { status:400 });
    const { actor, isAdmin: actorAdmin, pool } = await getAdminAccess(req.cookies.get("token")?.value);
    if (body.isAdmin !== undefined && (typeof body.isAdmin !== "boolean" || !actorAdmin)) throw new Error("FORBIDDEN");

    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      const target = await new sql.Request(tx).input("UserId", sql.BigInt, oldId)
        .query("SELECT TOP(1) Mahal, IsAdmin, IsActive FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@UserId");
      const row = target.recordset?.[0];
      if (!row) throw new Error("NOT_FOUND");
      if (!isMahalInScope(actor.mahal, Number(row.Mahal))) throw new Error("FORBIDDEN");
      if (!actorAdmin && (row.IsAdmin === true || row.IsAdmin === 1)) throw new Error("FORBIDDEN");
      if (actorAdmin && body.isAdmin === false && (row.IsAdmin === true || row.IsAdmin === 1) && row.IsActive) {
        const count = await new sql.Request(tx).query("SELECT COUNT(*) AS N FROM dbo.Users WITH (UPDLOCK,HOLDLOCK) WHERE IsAdmin=1 AND IsActive=1");
        if (Number(count.recordset?.[0]?.N ?? 0) <= 1) throw new Error("LAST_ADMIN");
      }
      await new sql.Request(tx)
        .input("OldUserId", sql.BigInt, oldId).input("NewUserId", sql.BigInt, newId)
        .input("PersonId", sql.BigInt, personId).input("PostId", sql.Int, postId)
        .input("Password", sql.NVarChar(200), String(body.password || "").trim())
        .execute("Users.SP_UpdateUserEditableName");
      if (actorAdmin && typeof body.isAdmin === "boolean") {
        const changed = await new sql.Request(tx).input("UserId", sql.BigInt, newId)
          .input("IsAdmin", sql.Bit, body.isAdmin)
          .query("UPDATE dbo.Users SET IsAdmin=@IsAdmin WHERE UserId=@UserId");
        if (!changed.rowsAffected?.[0]) throw new Error("UPDATE_FAILED");
      }
      await tx.commit();
    } catch(error) {
      await tx.rollback();
      throw error;
    }
    return NextResponse.json({ status: 200, saved: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : message === "LAST_ADMIN" ? 409 : message === "NOT_FOUND" ? 404 : 500;
    return NextResponse.json({ status, error: status === 403 ? "مجوز ویرایش این کاربر یا تغییر مدیر سامانه را ندارید." :
      status === 409 ? "امکان لغو دسترسی آخرین مدیر فعال سامانه وجود ندارد." :
      status === 404 ? "کاربر یافت نشد." : status === 401 ? "نشست نامعتبر است." : "ویرایش کاربر انجام نشد." }, { status });
  }
}
