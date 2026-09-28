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
    const { shomarehParvandeh, codeEntekhabat, tagSalahiyat, userId
    } = body;

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
            .input("ShomarehParvandeh", sql.BigInt, shomarehParvandeh)
            .input("CodeEntekhabat", sql.BigInt, codeEntekhabat)
            .input("TagSalahiyat", sql.BigInt, tagSalahiyat)
            .input("UserId", sql.BigInt, userId)
            .execute("Davtalab.SP_DeleteAshkhasKholasehSalahiyat");

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
