import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";
import sql from "mssql";

export async function POST(req: NextRequest) {
    try {
        // توکن بررسی شود
        const token = req.cookies.get("token")?.value;
        if (!token) {
            return NextResponse.json(
                { status: 401, error: "Unauthorized: No token" },
                { status: 401 }
            );
        } verifyToken(token);

        // بدنه درخواست
        const body = await req.json();
        const { erjaid } = body;

        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, erjaid)
            .execute("Tahghighat.SP_GetJambandiOstan"); // یا کوئری SELECT مستقیم

        return NextResponse.json({
            status: 200,
            data: result.recordset,
        });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { status: 500, error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
