import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { requireResearchIdentity, researchAccessResponse, researchMutationResponse, positiveId, assertResearchCaseScope, ResearchAccessError } from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }
    const body = await req.json();
    const { karbargid, tahghightype, typeMahalTahghigh, azSal, taSal
        , CodeManba, tahghighid, tozihat, nahve_Ashnai, userid
        , noeParvandeh, nameSazman, nameShahr, naveBazkhani, peyvast } = body;

    try {
        const actor = await requireResearchIdentity(token, userid);
        const requestedTahghighId = positiveId(tahghighid);
        if (!requestedTahghighId || !Number.isSafeInteger(Number(karbargid)) || Number(karbargid) < 0) {
            return NextResponse.json({ status: 400, error: "شناسه کاربرگ یا تحقیق نامعتبر است." }, { status: 400 });
        }
        const pool = await getConnection();
        const scope = await pool.request()
            .input("TahghighId", sql.BigInt, requestedTahghighId)
            .query(`SELECT TOP (1) ErjaId FROM Tahghighat.Erja_Tahghigh
                    WHERE TahghighId = @TahghighId AND IsDelete = 0`);
        const erja = scope.recordset?.[0];
        if (!erja) throw new ResearchAccessError(403, "ارجاع تحقیق معتبر نیست.");
        await assertResearchCaseScope(actor, erja.ErjaId);
        if (Number(karbargid) > 0) {
            const existing = await pool.request()
                .input("KarbargId", sql.BigInt, Number(karbargid))
                .input("TahghighId", sql.BigInt, requestedTahghighId)
                .query(`SELECT TOP (1) KarbargId FROM Tahghighat.Erja_Tahghigh_Karbarg
                        WHERE KarbargId = @KarbargId AND TahghighId = @TahghighId
                          AND ISNULL(IsDelete, 0) = 0`);
            if (!existing.recordset?.[0]) {
                throw new ResearchAccessError(403, "این کاربرگ برای ویرایش مجاز نیست.");
            }
        }
    } catch (error) {
        return researchAccessResponse(error);
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("KarbargId", sql.BigInt, karbargid)
            .input("TahghighType", sql.Int, tahghightype)
            .input("CodeManba", sql.BigInt, CodeManba)
            .input("TahghighId", sql.BigInt, tahghighid)
            .input("TypeMahalTahghigh", sql.Int, typeMahalTahghigh)
            .input("AzSal", sql.Int, azSal)
            .input("TaSal", sql.Int, taSal)
            .input("Nahve_Ashnai", sql.NVarChar(sql.MAX), nahve_Ashnai)
            .input("Description", sql.NVarChar(sql.MAX), tozihat)
            .input("CreateUserId", sql.BigInt, userid)
            .input("NoeParvandeh", sql.Int, noeParvandeh)
            .input("NameSazman", sql.NVarChar(350), nameSazman)
            .input("NameShahr", sql.NVarChar(350), nameShahr)
            .input("NaveBazkhani", sql.Int, naveBazkhani)
            .input("Peyvast", sql.Int, peyvast)
            .execute("Tahghighat.SP_InsertKarbarg");

        const row = result.recordset?.[0];
        if (!row || ![true, 1, "1"].includes(row.IsSuccess)) {
            return NextResponse.json({ status: 409, error: "ثبت کاربرگ در SQL تأیید نشد." }, { status: 409 });
        }
        return researchMutationResponse(result);

    } catch (err) {
        return researchAccessResponse(err);
    }
}
