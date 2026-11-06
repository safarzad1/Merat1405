import { NextRequest, NextResponse } from "next/server";
import sql, { MAX } from "mssql";

import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse, researchMutationResponse, assertResearchCaseScope } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }

    const body = await req.json();
    const { erjaid, isdone, erjaLastState, sharheghdam, userid } = body;

    if (![erjaid, erjaLastState, userid].every((value) =>
        Number.isSafeInteger(Number(value)) && Number(value) > 0
    ) || typeof sharheghdam !== "string") {
        return NextResponse.json({ error: "پارامترهای تغییر وضعیت معتبر نیستند" }, { status: 400 });
    }

    try {
        const actor = await requireResearchIdentity(token, userid);
        await assertResearchCaseScope(actor, erjaid);
    } catch (error) {
        return researchAccessResponse(error);
    }

    if (!(typeof isdone === "boolean" || isdone === 0 || isdone === 1)) {
        return NextResponse.json({ error: "وضعیت نهایی بودن معتبر نیست" }, { status: 400 });
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaid)
            .input("IsDone", sql.Int, Number(isdone))
            .input("ErjaLastState", sql.Int, erjaLastState)
            .input("SharhEghdam", sql.NVarChar(MAX), sharheghdam)
            .input("UserId", sql.BigInt, userid)
            .execute("Tahghighat.SP_Update_Erja");

        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
