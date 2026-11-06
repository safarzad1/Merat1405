import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, assertResearchKarbargScope, researchAccessResponse,
  researchMutationResponse, positiveId,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const { karbargid, userid } = await req.json();
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value, userid);
    const id = positiveId(karbargid);
    if (!id) return NextResponse.json({ status: 400, error: "شناسه کاربرگ نامعتبر است." }, { status: 400 });
    await assertResearchKarbargScope(actor, id);
    const pool = await getConnection();
    const result = await pool.request()
      .input("KarbargId", sql.BigInt, id)
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_DeleteKarbarg");
    return researchMutationResponse(result);
  } catch (error) {
    return researchAccessResponse(error);
  }
}
