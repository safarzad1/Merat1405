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
    const { karbargid,emteyazKeyfi,emteyazPrice,userId } = body;

    if (!karbargid) {
        return NextResponse.json({ error: "karbargid required" }, { status: 400 });
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
            .input("KarbargId", sql.BigInt, karbargid)
            .input("EmteyazKeyfi", sql.Int, emteyazKeyfi)
            .input("EmteyazPrice", sql.Int, emteyazPrice)
            .input("UserId", sql.BigInt, userId)
            .execute("Tahghighat.SP_InsertTahghighKarbargEmteyaz");

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
