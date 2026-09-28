import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber } from "../_shared";
export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try { const { userId } = await req.json(); const pool = await getConnection(); const r = await pool.request().input("UserId", sql.BigInt, positiveNumber(userId,"UserId")).execute("Akhbar.SP_GetKhabarBoxCounts"); return NextResponse.json({status:200,data:r.recordset?.[0]||{}}); } catch(err){ return errorResponse(err); }
}
