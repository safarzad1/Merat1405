import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, researchAccessResponse, researchMutationResponse,
  positiveId, assertResearchCaseScope,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const { karbargid, filename, fileextend, filesize, userid } = await req.json();
    const id = positiveId(karbargid);
    if (!id || positiveId(userid) !== actor.userId ||
        typeof filename !== "string" || !filename.trim() || filename.length > 200 ||
        filename.includes("\0") ||
        typeof fileextend !== "string" || !fileextend.trim() || fileextend.length > 10 ||
        filesize === null || filesize === undefined || String(filesize).length > 20) {
      return NextResponse.json({ status: 400, error: "اطلاعات پیوست نامعتبر است." }, { status: 400 });
    }
    const pool = await getConnection();
    const link = await pool.request().input("KarbargId", sql.BigInt, id)
      .query(`SELECT TOP (1) ErjaId FROM Tahghighat.Erja_Tahghigh_Karbarg
              WHERE KarbargId = @KarbargId AND ISNULL(IsDelete,0) = 0`);
    if (!link.recordset?.[0]) {
      return NextResponse.json({ status: 404, error: "کاربرگ یافت نشد." }, { status: 404 });
    }
    await assertResearchCaseScope(actor, link.recordset[0].ErjaId);
    const result = await pool.request()
      .input("KarbargId", sql.BigInt, id)
      .input("FileName", sql.NVarChar(200), filename)
      .input("FileExtend", sql.NVarChar(10), fileextend)
      .input("FileSize", sql.NVarChar(20), String(filesize))
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_InsertKarbargPeyvast");
    return researchMutationResponse(result);
  } catch (err) {
    return researchAccessResponse(err);
  }
}
