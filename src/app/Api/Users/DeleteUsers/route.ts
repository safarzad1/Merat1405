import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { isMahalInScope } from "@/lib/userScope";
import { getAdminAccess } from "@/lib/adminAccess";

export async function POST(req: NextRequest) {
  try {
    const { userID } = await req.json();
    if (!userID) return NextResponse.json({ error: "userID required" }, { status: 400 });
    const { actor } = await getAdminAccess(req.cookies.get("token")?.value);
    const targetId = Number(userID);
    if (targetId === actor.userId) return NextResponse.json({ status: 403, error: "حذف حساب کاربری خودتان مجاز نیست." }, { status: 403 });

    const pool = await getConnection();
    const target = await pool.request().input("UserId", sql.BigInt, targetId)
      .query("SELECT TOP 1 Mahal, IsAdmin FROM dbo.Users WHERE UserId=@UserId");
    const targetMahal = Number(target.recordset?.[0]?.Mahal || 0);
    if (!targetMahal || !isMahalInScope(actor.mahal, targetMahal)) return NextResponse.json({ status: 403, error: "اجازه حذف این کاربر را ندارید." }, { status: 403 });
    // Administrators must first have their privilege revoked by another administrator.
    // This avoids racing deletions of the final active administrator.
    if (target.recordset?.[0]?.IsAdmin === true || target.recordset?.[0]?.IsAdmin === 1)
      return NextResponse.json({ status:403, error:"ابتدا دسترسی مدیر سامانه را در فرم ویرایش لغو کنید؛ حذف مستقیم مدیر مجاز نیست." }, { status:403 });

    const result = await pool.request().input("UserID", sql.BigInt, targetId).input("CreateUserId", sql.BigInt, actor.userId).execute("Users.SP_DeleteUser");
    return NextResponse.json({ status: 200, data: result.recordset });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message === "UNAUTHORIZED") return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
