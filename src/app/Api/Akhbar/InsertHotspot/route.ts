import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser, NewsInputError } from "../_shared";

export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try {
    const b = await req.json();
    await assertSessionUser(req, positiveNumber(b.createUserId, "UserId"));
    const title = typeof b.onvan === "string" ? b.onvan.trim() : "";
    if (!title || title.length > 300) throw new NewsInputError("عنوان نقطه خبرخیز باید بین ۱ تا ۳۰۰ نویسه باشد.");
    const pool = await getConnection();
    const r = await pool.request()
      .input("Onvan", sql.NVarChar(300), title)
      .input("CreateUserId", sql.BigInt, positiveNumber(b.createUserId, "UserId"))
      .execute("Akhbar.SP_InsertNoghteKhabarkhiz");
    return NextResponse.json({ status: 200, data: r.recordset?.[0] || null });
  } catch (err) { return errorResponse(err); }
}
