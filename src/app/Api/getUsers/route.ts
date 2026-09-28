import { NextRequest, NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }
    try {
        const pool = await getConnection();
        const result = await pool.request().execute("SP_GetUsersAll");

        if (!result.recordset || result.recordset.length === 0) {
            return NextResponse.json({ status: 204, message: "هیچ داده‌ای از سرور بازنگشت" });
        }

        // برگرداندن کل رکوردها برای Stimulsoft
        return NextResponse.json({ status: 200, data: result.recordset });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
