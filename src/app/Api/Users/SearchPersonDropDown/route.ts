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
    const { mahal, search } = body;

    if (!mahal) {
        return NextResponse.json({ error: "mahal required" }, { status: 400 });
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
        const rawSearch = String(search ?? "").trim();
        let normalizedSearch = rawSearch;

        if (rawSearch) {
            const normalized = await pool
                .request()
                .input("SearchText", sql.NVarChar(sql.MAX), rawSearch)
                .query("SELECT [dbo].[NormalizePersianText](@SearchText) AS NormalizedSearch");

            normalizedSearch = String(normalized.recordset?.[0]?.NormalizedSearch ?? rawSearch).trim();
        }
        const result = await pool
            .request()
            .input("Mahal", sql.Int, mahal)
            .input("Search", sql.NVarChar(200), normalizedSearch)
            .execute("SP_GetPersonDropDown");

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
