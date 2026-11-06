import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { requireAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { actor, pool } = await requireAdmin(req.cookies.get("token")?.value);
    const newsNo = Number(req.nextUrl.searchParams.get("newsNo"));
    if (!Number.isSafeInteger(newsNo) || newsNo <= 0)
      return NextResponse.json({ status: 422, error: "شماره خبر معتبر نیست." }, { status: 422 });
    const result = await pool.request().input("AdminUserId", sql.BigInt, actor.userId)
      .input("ShomareKhabar", sql.BigInt, newsNo)
      .execute("Akhbar.SP_GetKhabarReassignmentCandidates");
    const history = await pool.request().input("NewsNo", sql.BigInt, newsNo).query(`
      SELECT TOP (12) R.OldUserId,R.NewUserId,R.AdminUserId,R.Reason,R.CreatedAtJalali,
        ISNULL(O.FullName,N'') AS OldName,ISNULL(N.FullName,N'') AS NewName,
        ISNULL(A.FullName,N'') AS AdminName
      FROM Akhbar.KhabarReassignmentAudit R
      LEFT JOIN dbo.Vbl_Users O ON O.UserId=R.OldUserId
      LEFT JOIN dbo.Vbl_Users N ON N.UserId=R.NewUserId
      LEFT JOIN dbo.Vbl_Users A ON A.UserId=R.AdminUserId
      WHERE R.ShomareKhabar=@NewsNo ORDER BY R.ReassignmentId DESC`);
    return NextResponse.json({ status: 200, candidates: result.recordset || [], history: history.recordset || [] },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    return NextResponse.json({ status, error: status === 403 ? "مجوز مدیریت اخبار ندارید." :
      status === 401 ? "نشست معتبر نیست." : "فهرست کاربران مجاز دریافت نشد. وضعیت خبر را بررسی کنید." },
      { status, headers: { "Cache-Control": "private, no-store" } });
  }
}
