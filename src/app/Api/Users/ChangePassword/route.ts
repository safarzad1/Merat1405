import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { getAdminAccess } from "@/lib/adminAccess";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    const body = await req.json();
    const { password, userid } = body;
    let access;
    try {
      access = await getAdminAccess(token);
    } catch {
      return NextResponse.json({ status:401, error:"نشست نامعتبر است." }, { status:401 });
    }
    const targetId = Number(userid);
    if (!Number.isSafeInteger(targetId) || targetId <= 0)
      return NextResponse.json({ status:400, error:"شناسه کاربر نامعتبر است." }, { status:400 });
    if (targetId !== access.actor.userId && !access.isAdmin)
      return NextResponse.json({ status:403, error:"اجازه تغییر رمز عبور کاربر دیگر را ندارید." }, { status:403 });

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("Password", sql.BigInt, password)
            .input("UserId", sql.BigInt, userid)
            .execute("SP_ChangePassword");

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
