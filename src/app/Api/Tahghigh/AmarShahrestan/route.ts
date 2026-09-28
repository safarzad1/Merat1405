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

    // ✅ اعتبارسنجی توکن
    try {
        verifyToken(token);
    } catch {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: Invalid or expired token" },
            { status: 401 }
        );
    }

    // ✅ ورودی
    const body = await req.json();
    const mahal = Number(body?.mahal);
    const userId = Number(body?.userId);

    if (!mahal) {
        return NextResponse.json(
            { status: 400, error: "mahal required" },
            { status: 400 }
        );
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("Mahal", sql.Int, mahal)
            .input("UserId", sql.BigInt, userId)
            .execute("Tahghighat.SP_GetAmarTahghighatSahahrestan");

        return NextResponse.json({ status: 200, data: result.recordset }, { status: 200 });
    } catch (err) {
        return NextResponse.json(
            { status: 500, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
