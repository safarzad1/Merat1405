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
    const { filename, userid, karbargid } = await req.json();
    if (positiveId(userid) !== actor.userId || !positiveId(karbargid) ||
        typeof filename !== "string" || !filename.trim() || filename.length > 200 ||
        filename.includes("\0")) {
      return NextResponse.json({ status: 400, error: "شناسه کاربرگ یا نام فایل نامعتبر است." }, { status: 400 });
    }
    const pool = await getConnection();
    const link = await pool.request()
      .input("KarbargId", sql.BigInt, Number(karbargid))
      .input("FileName", sql.NVarChar(200), filename)
      .query(`SELECT TOP (1) K.ErjaId
              FROM Tahghighat.Erja_Tahghigh_Karbarg K
              INNER JOIN Tahghighat.Erja_Tahghigh_Karbarg_Peyvast P
                ON P.KarbargId = K.KarbargId
              WHERE K.KarbargId = @KarbargId AND P.FileName = @FileName
                AND ISNULL(K.IsDelete,0) = 0 AND ISNULL(P.IsDelete,0) = 0`);
    if (!link.recordset?.[0]) {
      return NextResponse.json({ status: 404, error: "پیوست این کاربرگ یافت نشد." }, { status: 404 });
    }
    await assertResearchCaseScope(actor, link.recordset[0].ErjaId);
    const result = await pool.request()
      .input("KarbargId", sql.BigInt, Number(karbargid))
      .input("FileName", sql.NVarChar(200), filename)
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_DeletePeyvastTahghighByKarbarg");
    return researchMutationResponse(result);
  } catch (err) {
    return researchAccessResponse(err);
  }
}
