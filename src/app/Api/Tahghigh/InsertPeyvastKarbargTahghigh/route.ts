import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const form = await req.formData();

        const karbargId = String(form.get("karbargId") ?? "").trim();
        const userIdRaw = String(form.get("userId") ?? "").trim();
        const fileName = String(form.get("fileName") ?? "").trim();
        const file = form.get("file") as File | null;

        const userId = Number(userIdRaw);
        if (!Number.isFinite(userId)) {
            return NextResponse.json(
                { status: 400, message: "UserId نامعتبر است" },
                { status: 400 }
            );
        }

        if (!file) {
            return NextResponse.json(
                { status: 400, message: "فایل ارسال نشده است" },
                { status: 400 }
            );
        }

        // محدودیت حجم (اختیاری)
        const MAX_BYTES = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { status: 400, message: "حجم فایل بیش از حد مجاز است (حداکثر 2MB)" },
                { status: 400 }
            );
        }

        // File -> Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // چون SP پارامتر nchar(10) دارد، بهتره 10 کاراکتر پد شود
        const pool = await getConnection();

        await pool
            .request()
            .input("KarbargId", sql.BigInt, karbargId)          // مطابق SP
            .input("Files", sql.VarBinary(sql.MAX), buffer)     // varbinary(max)
            .input("FileName", sql.NVarChar(200), fileName)
            .input("CreateUserId", sql.BigInt, userId)
            .execute("[Tahghighat].SP_InsertTahghighatPeyvast");

        return NextResponse.json(
            { status: 200, message: "عکس با موفقیت ذخیره شد" },
            { status: 200 }
        );
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
