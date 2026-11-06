import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, assertResearchTahghighScope, researchAccessResponse,
  researchMutationResponse, positiveId,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const { tahghighId, fileName, userid } = await req.json();
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value, userid);
    const id = positiveId(tahghighId);
    if (!id || typeof fileName !== "string" || !fileName.trim() || fileName.length > 200) {
      return NextResponse.json({ status: 400, error: "شناسه تحقیق یا نام سند نامعتبر است." }, { status: 400 });
    }
    await assertResearchTahghighScope(actor, id);
    const pool = await getConnection();
    const result = await pool.request()
      .input("TahghighId", sql.BigInt, id)
      .input("FileName", sql.NVarChar(200), fileName)
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_DeleteTahghigh_JambandiPeyvast");
    return researchMutationResponse(result);
  } catch (error) {
    return researchAccessResponse(error);
  }
}
