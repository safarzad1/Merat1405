import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  positiveId, requireResearchIdentity, assertResearchCaseScope,
  researchAccessResponse,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const { karbargid } = await req.json();
    const id = positiveId(karbargid);
    if (!id) return NextResponse.json({ status: 400, error: "شناسه کاربرگ نامعتبر است." }, { status: 400 });
    const pool = await getConnection();
    const check = await pool.request().input("KarbargId", sql.BigInt, id)
      .query(`SELECT TOP (1) ErjaId FROM Tahghighat.Erja_Tahghigh_Karbarg
              WHERE KarbargId = @KarbargId AND ISNULL(IsDelete, 0) = 0`);
    if (!check.recordset?.[0]) return NextResponse.json({ status: 404, error: "کاربرگ یافت نشد." }, { status: 404 });
    await assertResearchCaseScope(actor, check.recordset[0].ErjaId);
    const result = await pool.request().input("KarbargId", sql.BigInt, id)
      .execute("Tahghighat.SP_Get_Tahghigh_Karbarg_Peyvast");
    return NextResponse.json({ status: 200, data: result.recordset ?? [] });
  } catch (error) {
    return researchAccessResponse(error);
  }
}
