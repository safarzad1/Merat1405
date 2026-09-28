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
    const { mahal, codeEntekhabat, codeHozeh, natije, page, sizePage, sortIndex, sesdec, search, userId, value } = body;

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
            .input("Mahal", sql.Int, mahal)
            .input("CodeEntekhabat", sql.Int, codeEntekhabat)
            .input("CodeHozeh", sql.Int, codeHozeh)
            .input("Natije", sql.Int, natije)
            .input("Page", sql.Int, page)
            .input("SizePage", sql.Int, sizePage)
            .input("SortIndex", sql.Int, sortIndex)
            .input("SECDEC", sql.Int, sesdec)
            .input("Search", sql.NVarChar(200), search)
            .input("UserId", sql.BigInt, userId)
            .input("Value", sql.Int, value)
            .execute("[Davtalab].[SP_GetAshkhasPage]");

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
