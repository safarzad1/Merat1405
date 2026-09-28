import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const fileNameRaw = String(body?.fileName ?? "").trim();
        const userIdRaw = String(body?.userId ?? "").trim();

        if (!fileNameRaw) {
            return NextResponse.json(
                { status: 400, message: "نام فایل الزامی است" },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const dbResult = await pool
            .request()
            .input("FileName", sql.NVarChar(200), fileNameRaw)
            .input("UserId", sql.BigInt, userIdRaw)
            .execute("SP_GetFileNameh");

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

        const ext = fileNameRaw.split('.').pop()?.toLowerCase() || "jpg";
        let contentType = "application/octet-stream"; // پیش‌فرض

        if (ext === "jpg" || ext === "jpeg") contentType = "image/jpeg";
        else if (ext === "png") contentType = "image/png";
        else if (ext === "pdf") contentType = "application/pdf";
        else if (ext === "gif") contentType = "image/gif";

        return new NextResponse(new Uint8Array(buffer), {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `inline; filename="${encodeURIComponent(fileNameRaw)}"`,
                "Content-Length": buffer.length.toString(),
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (err) {
        console.error("Error in GetFileNamePic API:", err);
        return NextResponse.json(
            {
                status: 500,
                message: err instanceof Error ? err.message : "خطای ناشناخته در سرور",
            },
            { status: 500 }
        );
    }
}