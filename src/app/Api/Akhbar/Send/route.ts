import { validateExpectedRecipient } from "@/lib/newsPhase13Validation";
import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser } from "../_shared";

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    const b = await req.json(); await assertSessionUser(req,positiveNumber(b.userId,"UserId"));
    const newsNo = positiveNumber(b.shomareKhabar, "شماره خبر");
    const userId = positiveNumber(b.userId, "UserId");
    const description = String(b.tozihat ?? "").trim();
    if (description.length > 50000) {
      return NextResponse.json({ status: 422, error: "توضیحات ارسال حداکثر ۵۰٬۰۰۰ نویسه می‌تواند باشد." }, { status: 422 });
    }
    const requestKey = String(b.requestKey || "").trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestKey)) {
      return NextResponse.json({ status: 422, error: "شناسه یکتای درخواست ارسال معتبر نیست." }, { status: 422 });
    }
    const pool = await getConnection();
    // Preflight check for a clear UI error; a matching database guard is supplied
    // in the single SQL migration for this phase to prevent bypass/races.
    const people = await pool.request()
      .input("ShomareKhabar", sql.BigInt, newsNo)
      .query(`SELECT TOP (1) 1 AS HasPerson FROM [Akhbar].[KhabarAshkhas]
              WHERE [ShomareKhabar] = @ShomareKhabar AND [IsDelete] = 0
              UNION ALL SELECT TOP (1) 1 AS HasPerson FROM [Akhbar].[KhabarManualPersons]
              WHERE [ShomareKhabar] = @ShomareKhabar AND [IsDelete] = 0`);
    if (!people.recordset?.length) {
      return NextResponse.json({ status: 422, error: "ارسال خبر بدون ثبت حداقل یک شخص وابسته مجاز نیست." }, { status: 422 });
    }
    const expected = validateExpectedRecipient(b.expectedToUserId);
    const r = await pool.request()
      .input("ShomareKhabar", sql.BigInt, newsNo)
      .input("UserId", sql.BigInt, userId)
      .input("Tozihat", sql.NVarChar(sql.MAX), description || null)
      .input("ExpectedToUserId", sql.BigInt, expected)
      .input("RequestKey", sql.UniqueIdentifier, requestKey)
      .execute("Akhbar.SP_SendKhabar");
    return NextResponse.json({ status: 200, data: r.recordset?.[0] || null });
  } catch (err) {
    return errorResponse(err);
  }
}
