import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

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
        verifyToken(token);
    } catch {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: Invalid or expired token" },
            { status: 401 }
        );
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
            .input("Nahve_Ashnai", sql.NVarChar(4000), nahve_Ashnai)
            .input("Description", sql.NVarChar(4000), tozihat)
            .input("CreateUserId", sql.BigInt, userid)
            .input("NoeParvandeh", sql.Int, noeParvandeh)
            .input("NameSazman", sql.NVarChar(250), nameSazman)
            .input("NameShahr", sql.NVarChar(250), nameShahr)
            .input("NaveBazkhani", sql.Int, naveBazkhani)
            .input("Peyvast", sql.Int, peyvast)
            .execute("Tahghighat.SP_InsertKarbarg");

        return NextResponse.json(
            { status: 200, data: result.recordset }
        );

    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
