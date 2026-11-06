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
    const { userId, recordState } = body;

    try {
        await requireResearchIdentity(token, userId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    const normalizedUserId = Number(userId);
    const normalizedRecordState = Number(recordState);
    if (!Number.isSafeInteger(normalizedUserId) || normalizedUserId <= 0 ||
        !Number.isSafeInteger(normalizedRecordState) || normalizedRecordState < 0) {
        return NextResponse.json(
            { status: 400, error: "شناسه کاربر یا وضعیت پرونده نامعتبر است." },
            { status: 400 }
        );
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("UserId", sql.BigInt, normalizedUserId)
            .input("RecordState", sql.Int, normalizedRecordState)
            .execute("Tahghighat.SP_Get_Tahghigh_Shoraye");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
