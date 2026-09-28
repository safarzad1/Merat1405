import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber } from "../_shared";

export async function POST(req: NextRequest) {
  const denied = authorize(req); if (denied) return denied;
  try {
    const { userId } = await req.json();
    const pool = await getConnection();
    const main = await pool.request().input("UserId", sql.BigInt, positiveNumber(userId, "UserId")).execute("Akhbar.SP_GetKhabarLookups");
    const [classifications, types, returnTags] = await Promise.all([71101, 71102, 71104].map(async (pid) => {
      const r = await pool.request().input("PID", sql.Int, pid).execute("dbo.SP_GetDFnByPID");
      return r.recordset || [];
    }));
    return NextResponse.json({ status: 200, sources: main.recordsets?.[0] || [], hotspots: main.recordsets?.[1] || [], classifications, types, returnTags });
  } catch (err) { return errorResponse(err); }
}
