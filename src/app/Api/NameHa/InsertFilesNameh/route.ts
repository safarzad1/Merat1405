import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const form = await req.formData();

        const personIdRaw = String(form.get("PersonId") ?? "").trim();
        const filenameRaw = String(form.get("fileName") ?? "").trim();
        const userIdRaw = String(form.get("userId") ?? "").trim();
        const file = form.get("file") as File | null;

        if (!filenameRaw || !userIdRaw) {
            return NextResponse.json(
                { status: 400, message: "نام کاربری و شناسه کاربر الزامی است" },
                { status: 400 }
            );
        }

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
        const MAX_BYTES = 5 * 1024 * 1024; // 2MB
        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { status: 400, message: "حجم فایل بیش از حد مجاز است (حداکثر 5MB)" },
                { status: 400 }
            );
        }

        // File -> Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const pool = await getConnection();

        await pool
            .request()
            .input("PersonId", sql.BigInt, personIdRaw)          // مطابق SP
            .input("FileName", sql.NVarChar(250), filenameRaw)          // مطابق SP
            .input("Files", sql.VarBinary(sql.MAX), buffer)     // varbinary(max)
            .input("CreateUserId", sql.BigInt, userId)
            .execute("SP_InsertNamehFiles");

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
