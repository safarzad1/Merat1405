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
    const {
        codeentekhabat,
        mahalreciver,
        erjastate, // (فعلاً استفاده نشده)
        page,
        sizepage,
        indexsort,
        ascdesc,
        search,
        idValue, userId
    } = body;

    if (!page) {
        return NextResponse.json({ status: 400, error: "page required" }, { status: 400 });
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
            .input("CodeEntekhabat", sql.Int, codeentekhabat)
            .input("MahalReciver", sql.Int, mahalreciver)
            // .input("ErjaLastState", sql.Int, erjastate)
            .input("Page", sql.Int, page)
            .input("SizePage", sql.Int, sizepage)
            .input("Search", sql.NVarChar(200), search ?? "")
            .input("SortIndex", sql.Int, indexsort ?? 1)
            .input("SECDEC", sql.Int, ascdesc ?? 1)
            .input("ItemValue", sql.Int, idValue ?? 0)
            .input("UserId", sql.BigInt, userId ?? 0)
            .execute("Tahghighat.SP_Get_Erja_MahalReciver_ErjaLastState");

        return NextResponse.json({ status: 200, data: result.recordset }, { status: 200 });
    } catch (err) {
        return NextResponse.json(
            { status: 500, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
