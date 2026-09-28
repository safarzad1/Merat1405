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
    } const body = await req.json();
    const { karbargid, filename, fileextend, filesize, userid } = body;

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
            .input("FileName", sql.NVarChar(200), filename)
            .input("FileExtend", sql.NVarChar(10), fileextend)
            .input("FileSize", sql.NVarChar(20), filesize)
            .input("UserId", sql.BigInt, userid)
            .execute("Tahghighat.SP_InsertKarbargPeyvast");

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
