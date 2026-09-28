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
    const { erjaId, perjaId, codeMohaghegh, expireDate
        , description, userId, isInsert
    } = body;

    try {
        verifyToken(token);
    } catch {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: Invalid or expired token" },
        );
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.Int, erjaId)
            .input("ErjaParentId", sql.Int, perjaId)
            .input("CodeMohaghegh", sql.Int, codeMohaghegh)
            .input("ExpireDate", sql.NVarChar(20), expireDate)
            .input("Description", sql.NVarChar(4000), description)
            .input("UserId", sql.Int, userId)
            .input("IsInsert", sql.Int, isInsert)
            .execute("Tahghighat.SP_InsertErjaBeMohaghegh");

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
