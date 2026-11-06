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
    const { erjaid, erjaParentId, lenhozeostan } = body;

    if ((!positiveId(erjaid) && !positiveId(erjaParentId))) {
        return NextResponse.json({ status: 400, error: "شناسه پرونده معتبر نیست." }, { status: 400 });
    }
    try {
        const actor = await requireResearchIdentity(token);
        await assertResearchCaseScope(actor, positiveId(erjaid) ? erjaid : erjaParentId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.Int, erjaid)
            .input("ErjaParentId", sql.Int, erjaParentId)
            .input("LenHozeOstan", sql.Int, lenhozeostan)
            .execute("Tahghighat.SP_GetOneErja");

        return NextResponse.json(
            { status: 200, data: result.recordset }
        );

    } catch (err) {
        return researchAccessResponse(err);
    }
}
