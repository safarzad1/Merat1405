import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse, researchMutationResponse, positiveId, assertResearchCaseScope } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }
    const body = await req.json();
    const { erjaId, perjaId, codeMohaghegh, expireDate
        , description, userId, isInsert
    } = body;

    try {
        const actor = await requireResearchIdentity(token, userId);
        if (!positiveId(userId) || !positiveId(erjaId) || !positiveId(codeMohaghegh) || ![0, 1].includes(Number(isInsert)) || typeof description !== "string" || description.length > 4000 || typeof expireDate !== "string" || !/^[0-9۰-۹٠-٩]{4}[\/][0-9۰-۹٠-٩]{2}[\/][0-9۰-۹٠-٩]{2}$/.test(expireDate)) {
            return NextResponse.json({ status: 400, error: "اطلاعات ارسال‌شده معتبر نیست." }, { status: 400 });
        }
        await assertResearchCaseScope(actor, erjaId);
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaId)
            .input("ErjaParentId", sql.BigInt, perjaId)
            .input("CodeMohaghegh", sql.BigInt, codeMohaghegh)
            .input("ExpireDate", sql.NVarChar(10), expireDate)
            .input("Description", sql.NVarChar(4000), description)
            .input("UserId", sql.BigInt, userId)
            .input("IsInsert", sql.Int, isInsert)
            .execute("Tahghighat.SP_InsertErjaBeMohaghegh");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
