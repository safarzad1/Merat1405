import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const usernameRaw = String(body?.username ?? "").trim();

        if (!usernameRaw) {
            return NextResponse.json(
                { status: 400, message: "نام کاربری الزامی است" },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const usernameNchar10 = usernameRaw.padEnd(10, " ").slice(0, 10);

        const dbResult = await pool
            .request()
            .input("UserName", sql.NChar(10), usernameNchar10) // ✅ مطابق SP nchar(10)
            .execute("SP_GetPersonPic");

        const fileRecord = dbResult?.recordset?.[0];

        const buffer = fileRecord?.Files;

        if (!buffer) {
            return NextResponse.json(
                { status: 404, message: "عکسی برای کاربر یافت نشد" },
                { status: 404 }
            );
        }

        if (!Buffer.isBuffer(buffer) || buffer.length < 50) {
            return NextResponse.json(
                { status: 404, message: "تصویر معتبر نیست" },
                { status: 404 }
            );
        }

        const contentType = "image/jpeg";

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${encodeURIComponent(
                    usernameRaw
                )}.jpg"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        return NextResponse.json(
            {
                status: 500,
                message: err instanceof Error ? err.message : "خطای ناشناخته در سرور",
            },
            { status: 500 }
        );
    }
}
