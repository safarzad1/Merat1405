import { NextRequest, NextResponse } from "next/server"; import sql from "mssql"; import {getConnection} from "@/lib/db"; import {authorize,errorResponse,positiveNumber,assertSessionUser} from "../_shared";
export async function POST(req:NextRequest){const denied=authorize(req);if(denied)return denied;try{const b=await req.json(); await assertSessionUser(req,positiveNumber(b.userId,"UserId"));const pool=await getConnection();const r=await pool.request().input("ShomareKhabar",sql.BigInt,positiveNumber(b.shomareKhabar,"شماره خبر")).input("UserId",sql.BigInt,positiveNumber(b.userId,"UserId")).execute("Akhbar.SP_GetKhabarById");const row=r.recordset?.[0]||null;
    if (row) {
      const can=await pool.request().input("ShomareKhabar",sql.BigInt,positiveNumber(b.shomareKhabar,"شماره خبر"))
        .input("UserId",sql.BigInt,positiveNumber(b.userId,"UserId"))
        .query("SELECT [Akhbar].[FN_CanEditKhabar](@ShomareKhabar,@UserId) AS CanEdit");
      row.CanEdit=Boolean(can.recordset?.[0]?.CanEdit);
      const resolution = await pool.request()
        .input("ShomareKhabar", sql.BigInt, positiveNumber(b.shomareKhabar,"شماره خبر"))
        .input("UserId", sql.BigInt, positiveNumber(b.userId,"UserId"))
        .query("SELECT [Akhbar].[FN_CanResolveCountyKhabarPersons](@ShomareKhabar,@UserId) AS CanResolveCountyPersons");
      row.CanResolveCountyPersons = Boolean(resolution.recordset?.[0]?.CanResolveCountyPersons);
      // Same verified return eligibility as the list and the SQL mutation.
      const returnGate = await pool.request()
        .input("ShomareKhabar", sql.BigInt, positiveNumber(b.shomareKhabar,"شماره خبر"))
        .input("UserId", sql.BigInt, positiveNumber(b.userId,"UserId"))
        .query("SELECT CAST(CASE WHEN EXISTS(SELECT 1 FROM Akhbar.FN_GetActiveReturnCandidate(@ShomareKhabar,@UserId)) THEN 1 ELSE 0 END AS BIT) AS CanReturn");
      row.CanReturn = Boolean(returnGate.recordset?.[0]?.CanReturn);
    }
    return NextResponse.json({status:200,data:row});}catch(err){return errorResponse(err)}}
