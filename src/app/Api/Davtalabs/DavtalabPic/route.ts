import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const shomarehParvandeh = String(body?.shomarehParvandeh ?? "").trim();

        if (!shomarehParvandeh) {
            return NextResponse.json(
                { status: 400, message: "شماره پرونده الزامی است" },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const dbResult = await pool
            .request()
            .input("ShomarehParvandeh", sql.BigInt, shomarehParvandeh)
            .execute("[Davtalab].[SP_GetPersonPic]");

        const fileRecord = dbResult?.recordset?.[0];
        const buffer = fileRecord?.Files;

        // بررسی وجود و اعتبار بافر
        // اگر بافر وجود نداشت یا طولش کمتر از ۵۰ بایت بود (یعنی عکس معتبر نیست)
        if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 50) {
            // تغییر مهم: به جای ارسال خطای 404، یک پاسخ خالی با وضعیت 200 ارسال می‌کنیم
            // این باعث می‌شود کلاینت وارد بخش خطا نشود و ساده‌تر null بودن عکس را تشخیص دهد
            return new NextResponse(null, { status: 200 });
        }

        const contentType = "image/jpeg";

        return new NextResponse(new Uint8Array(buffer), {
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${encodeURIComponent(
                    shomarehParvandeh
                )}.jpg"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (err) {
        console.error("Error in GetPersonPic API:", err);
        return NextResponse.json(
            {
                status: 500,
                message: err instanceof Error ? err.message : "خطای ناشناخته در سرور",
            },
            { status: 500 }
        );
    }
}