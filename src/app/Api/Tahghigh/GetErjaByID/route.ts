import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse, positiveId, assertResearchCaseScope } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }
    const body = await req.json();
    const { erjaId } = body;

    if (!positiveId(erjaId)) {
        return NextResponse.json({ status: 400, error: "شناسه پرونده معتبر نیست." }, { status: 400 });
    }
    try {
        const actor = await requireResearchIdentity(token);
        await assertResearchCaseScope(actor, erjaId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaId)
            .execute("Tahghighat.SP_GetOneErja_ByIDErja");

        return NextResponse.json(
            { status: 200, data: result.recordset }
        );

    } catch (err) {
        return researchAccessResponse(err);
    }
}
