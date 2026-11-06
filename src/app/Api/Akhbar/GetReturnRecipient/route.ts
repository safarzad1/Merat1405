import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser } from "../_shared";

export async function POST(req: NextRequest) {
  const denied = authorize(req);
  if (denied) return denied;
  try {
    const body = await req.json();
    const userId = positiveNumber(body.userId, "UserId");
    const newsNo = positiveNumber(body.shomareKhabar, "شماره خبر");
    await assertSessionUser(req, userId);
    const pool = await getConnection();
    const result = await pool.request()
      .input("ShomareKhabar", sql.BigInt, newsNo)
      .input("UserId", sql.BigInt, userId)
      .execute("Akhbar.SP_GetKhabarReturnRecipient");
    return NextResponse.json({status: 200, data: result.recordset?.[0] || null},
      {headers: {"Cache-Control": "private, no-store"}});
  } catch (err) { return errorResponse(err); }
}
