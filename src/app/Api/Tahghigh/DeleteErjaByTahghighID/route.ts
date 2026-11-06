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
    const { id, userId, sharh } = body;

    try {
        await requireResearchIdentity(token, userId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    const normalizedId = Number(id);
    const normalizedUserId = Number(userId);
    const reason = typeof sharh === "string" ? sharh.trim() : "";
    if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0 ||
        !Number.isSafeInteger(normalizedUserId) || normalizedUserId <= 0 ||
        reason.length <= 10 || reason.length > 3000) {
        return NextResponse.json(
            { status: 400, error: "شناسه‌ها و دلیل حذف (۱۱ تا ۳۰۰۰ نویسه) الزامی هستند." },
            { status: 400 }
        );
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("Id", sql.BigInt, normalizedId)
            .input("Sharh", sql.NVarChar(sql.MAX), reason)
            .input("UserId", sql.BigInt, normalizedUserId)
            .execute("Tahghighat.SP_DeleteErjaTahghighByID");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
