import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

export async function POST(req: Request) {
    try {
        const form = await req.formData();

        const shomarehParvandeh = form.get("shomarehParvandeh");
        const codeEntekhabat = form.get("codeEntekhabat");
        const safheh = form.get("safheh");
        const fileName = form.get("fileName");
        const soalat = form.get("soalat");
        const pasokh = form.get("pasokh");
        const manba1 = form.get("manba1");
        const manba2 = form.get("manba2");
        const manba3 = form.get("manba3");
        const manba4 = form.get("manba4");
        const manba5 = form.get("manba5");
        const manba6 = form.get("manba6");
        const tozihatMohaghegh = form.get("tozihatMohaghegh");
        const countPeyvast = form.get("countPeyvast");
        const codeMohaghegh = form.get("codeMohaghegh");
        const tarikhTakmil = form.get("tarikhTakmil");
        const createUserId = form.get("createUserId");

        const file = form.get("file") as File | null;

        if (!file) {
            return NextResponse.json(
                { status: 400, message: "فایل ارسال نشده است" },
                { status: 400 }
            );
        }

        // اصلاح محاسبه حجم فایل
        const MAX_BYTES = 2 * 1024 * 1024; // 2MB
        if (file.size > MAX_BYTES) {
            return NextResponse.json(
                { status: 400, message: "حجم فایل بیش از حد مجاز است (حداکثر 2MB)" },
                { status: 400 }
            );
        }

        // تبدیل فایل به Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const pool = await getConnection();

        await pool
            .request()
            .input("ShomarehParvandeh", sql.BigInt, shomarehParvandeh)
            .input("CodeEntekhabat", sql.BigInt, codeEntekhabat)
            .input("Safheh", sql.Int, safheh)
            .input("FileName", sql.NVarChar(250), fileName)
            .input("Soalat", sql.NVarChar(3500), soalat)
            .input("Pasokh", sql.NVarChar(3500), pasokh)
            .input("Manba1", sql.NVarChar(350), manba1)
            .input("Manba2", sql.NVarChar(350), manba2)
            .input("Manba3", sql.NVarChar(350), manba3)
            .input("Manba4", sql.NVarChar(350), manba4)
            .input("Manba5", sql.NVarChar(350), manba5)
            .input("Manba6", sql.NVarChar(350), manba6)
            .input("TozihatMohaghegh", sql.NVarChar(3500), tozihatMohaghegh)
            .input("CountPeyvast", sql.NVarChar(350), countPeyvast)
            .input("CodeMohaghegh", sql.BigInt, codeMohaghegh)
            .input("TarikhTakmil", sql.NVarChar(10), tarikhTakmil)
            .input("CreateUserId", sql.BigInt, createUserId)
            .input("Files", sql.VarBinary(sql.MAX), buffer)
            .execute("Tahghighat.SP_InsertKarbargTahghighDavtalab");

        return NextResponse.json(
            { status: 200, message: "داده‌ها و فایل با موفقیت ذخیره شد" },
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