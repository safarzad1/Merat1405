import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber } from "../_shared";
export async function POST(req: NextRequest) {
  const denied=authorize(req); if(denied)return denied;
  try { const b=await req.json(); const pool=await getConnection(); const r=await pool.request()
    .input("UserId",sql.BigInt,positiveNumber(b.userId,"UserId"))
    .input("Page",sql.Int,Math.max(1,Number(b.page||1)))
    .input("SizePage",sql.Int,Math.min(100,Math.max(1,Number(b.sizePage||20))))
    .input("SortIndex",sql.Int,Number(b.sortIndex||1))
    .input("SECDEC",sql.Int,Number(b.sortDirection||2))
    .input("Search",sql.NVarChar(200),String(b.search||""))
    .input("BoxType",sql.Int,Number(b.boxType||1))
    .execute("Akhbar.SP_GetKhabarPage"); return NextResponse.json({status:200,data:r.recordset||[]}); } catch(err){return errorResponse(err);}
}
