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
    const { erjaid, description, expireDate, userId, createUserId } = body;

    try {
        await requireResearchIdentity(token, createUserId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaid)
            .input("UserId", sql.BigInt, userId)
            .input("ExpireDate", sql.NVarChar(12), expireDate)
            .input("Description", sql.NVarChar(4000), description)
            .input("CreateUserId", sql.BigInt, createUserId)
            .execute("Tahghighat.SP_InsertShorayeTahghigh");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
