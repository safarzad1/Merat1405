import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { requireResearchIdentity, assertResearchCaseScope, researchAccessResponse, positiveId } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const { erjaid } = await req.json();
    if (!positiveId(erjaid)) {
      return NextResponse.json({ status: 400, error: "شناسه ارجاع معتبر نیست." }, { status: 400 });
    }
    await assertResearchCaseScope(actor, erjaid);
    const pool = await getConnection();
    const result = await pool.request().input("ErjaId", sql.BigInt, erjaid)
      .execute("Tahghighat.SP_Get_Ostan_JambandiPeyvast");
    return NextResponse.json({ status: 200, data: result.recordset });
  } catch (error) {
    return researchAccessResponse(error);
  }
}
