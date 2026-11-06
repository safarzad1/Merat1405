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
    const { perjaid, mahalSender, mahalReciver, description, userId, isInsert } = body;

    try {
        await requireResearchIdentity(token, userId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    if (![perjaid, mahalSender, mahalReciver, userId].every(
        (value) => Number.isSafeInteger(Number(value)) && Number(value) > 0
    ) || ![0, 1].includes(Number(isInsert)) ||
        typeof description !== "string" || description.length > 3000) {
        return NextResponse.json({ error: "پارامترهای ارجاع معتبر نیستند" }, { status: 400 });
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaParentId", sql.BigInt, perjaid)
            .input("MahalSender", sql.Int, mahalSender)
            .input("MahalReciver", sql.Int, mahalReciver)
            .input("Description", sql.NVarChar(3000), description)
            .input("UserId", sql.BigInt, userId)
            .input("IsInsert", sql.Int, isInsert)
            .execute("Tahghighat.SP_InsertErjaParvandeh");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
