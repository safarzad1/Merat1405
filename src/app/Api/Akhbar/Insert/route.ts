import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber } from "../_shared";

export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try {
    const b = await req.json();
    const pool = await getConnection();
    const r = await pool.request()
      .input("TabaqehBandi", sql.TinyInt, Number(b.tabaqehBandi || 1))
      .input("ManbaKhabarId", sql.Int, positiveNumber(b.manbaKhabarId, "منبع خبر"))
      .input("NoeKhabar", sql.TinyInt, Number(b.noeKhabar || 1))
      .input("TarikhNameh", sql.NChar(10), String(b.tarikhNameh || "").trim() || null)
      .input("ShomareNameh", sql.NVarChar(100), String(b.shomareNameh || "").trim() || null)
      .input("OnvanKhabar", sql.NVarChar(500), String(b.onvanKhabar || "").trim())
      .input("SharhKhabar", sql.NVarChar(sql.MAX), String(b.sharhKhabar || ""))
      .input("MolahazatKhabar", sql.NVarChar(sql.MAX), String(b.molahazatKhabar || ""))
      .input("NoghteKhabarkhizId", sql.BigInt, Number(b.noghteKhabarkhizId || 0) || null)
      .input("MahalNoghteKhabarkhiz", sql.NVarChar(500), String(b.mahalNoghteKhabarkhiz || "").trim() || null)
      .input("TarikhEnteshar", sql.NChar(10), String(b.tarikhEnteshar || "").trim() || null)
      .input("CreateUserId", sql.BigInt, positiveNumber(b.createUserId, "UserId"))
      .execute("Akhbar.SP_InsertKhabar");
    return NextResponse.json({ status: 200, data: r.recordset?.[0] || null });
  } catch (err) { return errorResponse(err); }
}
