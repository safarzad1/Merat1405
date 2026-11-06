import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser, NewsInputError } from "../_shared";

export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try {
    const b = await req.json();
    await assertSessionUser(req, positiveNumber(b.userId, "UserId"));
    const description = typeof b.tozihat === "string" ? b.tozihat.trim() : "";
    const reason = typeof b.dalilBargasht === "string" ? b.dalilBargasht.trim() : "";
    const tags = typeof b.eshkalatIds === "string" ? b.eshkalatIds.trim() : "";
    // A selected tag alone is not a written reason. Validate independently on the server.
    if (!reason || !description || !description.includes(reason))
      throw new NewsInputError("دلیل متنی برگشت اجباری است؛ انتخاب علت‌های آماده به‌تنهایی کافی نیست.");
    if (description.length > 2000) throw new NewsInputError("دلیل برگشت بیش از حد مجاز است.");
    if (tags.length > 500 || (tags && !/^\d+(,\d+)*$/.test(tags)))
      throw new NewsInputError("شناسه علل برگشت نامعتبر است.");
    const pool = await getConnection();
    const result = await pool.request()
      .input("ShomareKhabar", sql.BigInt, positiveNumber(b.shomareKhabar, "شماره خبر"))
      .input("UserId", sql.BigInt, positiveNumber(b.userId, "UserId"))
      .input("Tozihat", sql.NVarChar(2000), description)
      .input("EshkalatIds", sql.NVarChar(500), tags)
      .execute("Akhbar.SP_ReturnKhabar");
    return NextResponse.json({ status: 200, data: result.recordset?.[0] || null });
  } catch (err) { return errorResponse(err); }
}
