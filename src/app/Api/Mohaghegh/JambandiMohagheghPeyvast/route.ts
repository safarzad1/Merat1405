import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, assertResearchTahghighScope, researchAccessResponse,
  researchMutationResponse, positiveId,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const { tahghighid, fileName, fileExtend, fileSize, userid } = await req.json();
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value, userid);
    const id = positiveId(tahghighid);
    if (!id || typeof fileName !== "string" || !fileName.trim() || fileName.length > 200 ||
        typeof fileExtend !== "string" || !fileExtend.trim() || fileExtend.length > 20 ||
        fileSize === null || fileSize === undefined || String(fileSize).length > 20) {
      return NextResponse.json({ status: 400, error: "اطلاعات پیوست جمع‌بندی نامعتبر است." }, { status: 400 });
    }
    await assertResearchTahghighScope(actor, id);
    const pool = await getConnection();
    const result = await pool.request()
      .input("TahghighId", sql.BigInt, id)
      .input("FileName", sql.NVarChar(200), fileName)
      .input("FileExtend", sql.NVarChar(200), fileExtend)
      .input("FileSize", sql.NVarChar(20), String(fileSize))
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_Insert_Tahghigh_JambandiPeyvast");
    return researchMutationResponse(result);
  } catch (error) {
    return researchAccessResponse(error);
  }
}
