import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { assertMahalInScope } from "@/lib/userScope";

export async function POST(req: NextRequest) {
    try {
        const { pcityId } = await req.json();
        if (!pcityId) return NextResponse.json({ error: "pcityId required" }, { status: 400 });
        await assertMahalInScope(req.cookies.get("token")?.value, Number(pcityId));
        const pool = await getConnection();
        const result = await pool.request().input("PCityId", sql.BigInt, pcityId).execute("SP_GetCity");
        return NextResponse.json({ status: 200, data: result.recordset });
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        if (message === "UNAUTHORIZED") return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
        if (message === "FORBIDDEN") return NextResponse.json({ status: 403, error: "دسترسی به این محدوده مجاز نیست." }, { status: 403 });
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
