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
    const { erjaid, userId } = body;

    try {
        await requireResearchIdentity(token, userId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.Int, erjaid)
            .input("UserId", sql.Int, userId)
            .execute("Tahghighat.SP_DeleteErjaByID");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
