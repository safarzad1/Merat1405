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
    const { mahal, page, sizepage, indexsort, ascdesc, search, idValue } = body;

    if (!page) {
        return NextResponse.json({ error: "page required" }, { status: 400 });
    }

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
            .input("Page", sql.Int, page)
            .input("SizePage", sql.Int, sizepage)
            .input("SortIndex", sql.Int, indexsort)
            .input("SECDEC", sql.Int, ascdesc)
            .input("Search", sql.NVarChar(200), search)
            .execute("[Users].[SP_GetUsersPage]");

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
