import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, assertResearchTahghighScope, researchAccessResponse, positiveId,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const { tahghighid } = await req.json();
    const id = positiveId(tahghighid);
    if (!id) return NextResponse.json({ status: 400, error: "شناسه تحقیق نامعتبر است." }, { status: 400 });
    await assertResearchTahghighScope(actor, id);
    const pool = await getConnection();
    const result = await pool.request()
      .input("TahghighId", sql.BigInt, id)
      .execute("Tahghighat.SP_Get_Tahghigh_ByID");
    return NextResponse.json({ status: 200, data: result.recordset ?? [] });
  } catch (error) {
    return researchAccessResponse(error);
  }
}
