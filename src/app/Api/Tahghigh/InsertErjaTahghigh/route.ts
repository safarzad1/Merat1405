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
    const { perjaid, mahalSender, mahalReciver, description, userId, isInsert } = body;

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
            .input("ErjaParentId", sql.Int, perjaid)
            .input("MahalSender", sql.Int, mahalSender)
            .input("MahalReciver", sql.Int, mahalReciver)
            .input("Description", sql.NVarChar(4000), description)
            .input("UserId", sql.Int, userId)
            .input("IsInsert", sql.Int, isInsert)
            .execute("Tahghighat.SP_InsertErjaParvandeh");

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
