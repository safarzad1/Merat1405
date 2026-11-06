import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse, researchMutationResponse } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }

    const body = await req.json();
    const { erjaid, isdone, sharheghdam, userid } = body;

    if (!erjaid) {
        return NextResponse.json({ error: "page required" }, { status: 400 });
    }

    try {
        await requireResearchIdentity(token, userid);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaid)
            .input("IsDone", sql.Int, isdone)
            .input("SharhEghdam", sql.NVarChar(1400), sharheghdam)
            .input("UserId", sql.Int, userid)
            .execute("Tahghighat.SP_Update_Eghdam_Erja");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
