import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { requireResearchIdentity, assertResearchCaseScope, researchAccessResponse, positiveId } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const { erjaId } = await req.json();
    if (!positiveId(erjaId)) {
      return NextResponse.json({ status: 400, error: "شناسه ارجاع معتبر نیست." }, { status: 400 });
    }
    await assertResearchCaseScope(actor, erjaId);
    const pool = await getConnection();
    const result = await pool.request().input("ErjaId", sql.BigInt, erjaId)
      .execute("Tahghighat.SP_GetJambandeiForHozeh");
    return NextResponse.json({ status: 200, data: result.recordset });
  } catch (error) {
    return researchAccessResponse(error);
  }
}
