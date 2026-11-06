import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, assertResearchTahghighScope, researchAccessResponse,
  researchMutationResponse, positiveId,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const { tahghighid, isdone, sharheghdam, userid } = await req.json();
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value, userid);
    const id = positiveId(tahghighid);
    if (!id || ![0, 1].includes(Number(isdone)) || isdone === null || isdone === "" ||
        typeof sharheghdam !== "string") {
      return NextResponse.json({ status: 400, error: "اطلاعات اقدام تحقیق نامعتبر است." }, { status: 400 });
    }
    await assertResearchTahghighScope(actor, id);
    const pool = await getConnection();
    const result = await pool.request()
      .input("TahghighId", sql.BigInt, id)
      .input("IsDone", sql.Int, Number(isdone))
      .input("SharhEghdam", sql.NVarChar(sql.MAX), sharheghdam)
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_Update_Eghdam_Tahghigh");
    return researchMutationResponse(result);
  } catch (error) {
    return researchAccessResponse(error);
  }
}
