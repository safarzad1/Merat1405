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
      .query(`SELECT TOP (1) ErjaId, TahghighId,
                NoeParvandeh, NaveBazkhani, NameSazman, NameShahr, Peyvast
              FROM Tahghighat.Erja_Tahghigh_Karbarg
              WHERE KarbargId = @KarbargId AND ISNULL(IsDelete, 0) = 0`);
    const row = check.recordset?.[0];
    if (!row) return NextResponse.json({ status: 404, error: "کاربرگ یافت نشد." }, { status: 404 });
    await assertResearchCaseScope(actor, row.ErjaId);
    // Keep existing SP-based report fields, adding the editable fields it omits.
    const result = await pool.request().input("KarbargId", sql.BigInt, id)
      .execute("Tahghighat.SP_Get_Karbarg_ByID");
    return NextResponse.json({ status: 200, data: (result.recordset ?? []).map(
      (item) => ({ ...item, NoeParvandeh: row.NoeParvandeh,
        NaveBazkhani: row.NaveBazkhani, NameSazman: row.NameSazman,
        NameShahr: row.NameShahr, Peyvast: row.Peyvast })
    ) });
  } catch (error) {
    return researchAccessResponse(error);
  }
}
