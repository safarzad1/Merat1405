import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse, positiveId, assertResearchCaseScope } from "@/lib/researchSecurity";
import sql from "mssql";

export async function POST(req: NextRequest) {
    try {
        // توکن بررسی شود
        const token = req.cookies.get("token")?.value;
        if (!token) {
            return NextResponse.json(
                { status: 401, error: "Unauthorized: No token" },
                { status: 401 }
            );
        } const actor = await requireResearchIdentity(token);

        // بدنه درخواست
        const body = await req.json();
        const { erjaid } = body;
        if (!positiveId(erjaid)) return NextResponse.json({ status: 400, error: "شناسه پرونده معتبر نیست." }, { status: 400 });

        await assertResearchCaseScope(actor, erjaid);
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaid)
            .execute("Tahghighat.SP_GetJambandiOstan"); // یا کوئری SELECT مستقیم

        return NextResponse.json({
            status: 200,
            data: result.recordset,
        });
    } catch (err) {
        return researchAccessResponse(err);
    }
}
