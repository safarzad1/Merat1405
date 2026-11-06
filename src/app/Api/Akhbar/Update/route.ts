import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser } from "../_shared";
import { validateNewsForm } from "@/lib/newsPhase13Validation";

export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try {
    const b = await req.json();
    await assertSessionUser(req, positiveNumber(b.lastEditUserId, "UserId"));
    const fields = validateNewsForm(b);
    const pool = await getConnection();
    const r = await pool.request()
      .input("ShomareKhabar", sql.BigInt, positiveNumber(b.shomareKhabar, "شماره خبر"))
      .input("TabaqehBandi", sql.TinyInt, fields.tabaqehBandi)
      .input("ManbaKhabarId", sql.Int, fields.manbaKhabarId)
      .input("NoeKhabar", sql.TinyInt, fields.noeKhabar)
      .input("TarikhNameh", sql.NChar(10), fields.tarikhNameh)
      .input("ShomareNameh", sql.NVarChar(100), fields.shomareNameh)
      .input("OnvanKhabar", sql.NVarChar(500), fields.onvanKhabar)
      .input("SharhKhabar", sql.NVarChar(sql.MAX), fields.sharhKhabar)
      .input("MolahazatKhabar", sql.NVarChar(sql.MAX), fields.molahazatKhabar)
      .input("NoghteKhabarkhizId", sql.BigInt, fields.noghteKhabarkhizId)
      .input("MahalNoghteKhabarkhiz", sql.NVarChar(500), fields.mahalNoghteKhabarkhiz)
      .input("TarikhEnteshar", sql.NChar(10), fields.tarikhEnteshar)
      .input("LastEditUserId", sql.BigInt, positiveNumber(b.lastEditUserId, "UserId"))
      .execute("Akhbar.SP_UpdateKhabar");
    return NextResponse.json({ status: 200, data: r.recordset?.[0] || null });
  } catch (err) { return errorResponse(err); }
}
