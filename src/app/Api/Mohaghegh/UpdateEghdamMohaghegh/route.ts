import { NextRequest, NextResponse } from "next/server";
import sql, { MAX } from "mssql";

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
    const { tahghighid, isdone, sharheghdam, userid } = body;

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
            .input("TahghighId", sql.BigInt, tahghighid)
            .input("IsDone", sql.Int, isdone)
            .input("SharhEghdam", sql.NVarChar(MAX), sharheghdam)
            .input("UserId", sql.Int, userid)
            .execute("Tahghighat.SP_Update_Eghdam_Tahghigh");

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
