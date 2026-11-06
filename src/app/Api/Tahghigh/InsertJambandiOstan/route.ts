import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { requireResearchIdentity, requireClaimedActor, researchAccessResponse, researchMutationResponse, positiveId, assertResearchCaseScope } from "@/lib/researchSecurity";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }

    try {
        verifyToken(token);
    } catch {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: Invalid or expired token" },
            { status: 401 }
        );
    }

    try {
        const actor = await requireResearchIdentity(token);
        const form = await req.formData();

        // دریافت مقادیر
        const erjaId = form.get("erjaId");
        const pasokh1 = form.get("pasokh1");
        const pasokh2 = form.get("pasokh2");
        const pasokh3 = form.get("pasokh3");
        const pasokh4 = form.get("pasokh4");
        const pasokh5 = form.get("pasokh5");
        const pasokh6 = form.get("pasokh6");
        const pasokh7 = form.get("pasokh7");
        const pasokh8 = form.get("pasokh8");

        // مقادیر عددی (گزینه‌ها)
        const valuesoal1 = form.get("valuesoal1");
        const valuesoal2 = form.get("valuesoal2");
        const valuesoal3 = form.get("valuesoal3");
        const valuesoal4 = form.get("valuesoal4");
        const valuesoal5 = form.get("valuesoal5");
        const valuesoal6 = form.get("valuesoal6");
        const valuesoal7 = form.get("valuesoal7");

        const jambandi = form.get("jambandi");
        const userId = form.get("userId");
        requireClaimedActor(actor, userId);
        const filepage1 = form.get("filepage1");
        const filepage2 = form.get("filepage2");

        const parsedErjaId = positiveId(erjaId);
        const options = [valuesoal1, valuesoal2, valuesoal3, valuesoal4, valuesoal5, valuesoal6, valuesoal7];
        if (!parsedErjaId || options.some((v) => v === null || v === undefined || !/^[0-5]$/.test(String(v)))) {
            return NextResponse.json({ status: 400, error: "شناسه ارجاع یا پاسخ گزینه‌ها نامعتبر است." }, { status: 400 });
        }
        const texts = [pasokh1, pasokh2, pasokh3, pasokh4, pasokh5, pasokh6, pasokh7, pasokh8, jambandi];
        if (texts.some((v) => typeof v !== "string" || (v as string).length > 4000) ||
            [filepage1, filepage2].some((v) => typeof v !== "string" || (v as string).length > 200)) {
            return NextResponse.json({ status: 400, error: "متن یا نام فایل جمع‌بندی نامعتبر است." }, { status: 400 });
        }


        // const file1 = form.get("file1") as File | null;
        // const file2 = form.get("file2") as File | null;

        // ✅ اصلاح سینتکس محاسبه حجم فایل (استفاده از * به جای _)
        const MAX_BYTES = 2 * 1024 * 1024;

        // if (file1 && file1.size > MAX_BYTES) {
        //     return NextResponse.json(
        //         { status: 400, message: "حجم فایل اول بیش از حد مجاز است (2MB)" },
        //         { status: 400 }
        //     );
        // }
        // if (file2 && file2.size > MAX_BYTES) {
        //     return NextResponse.json(
        //         { status: 400, message: "حجم فایل دوم بیش از حد مجاز است (2MB)" },
        //         { status: 400 }
        //     );
        // }

        // let buffer1: Buffer | null = null;
        // let buffer2: Buffer | null = null;

        // if (file1) {
        //     const arrayBuffer1 = await file1.arrayBuffer();
        //     buffer1 = Buffer.from(arrayBuffer1);
        // }

        // if (file2) {
        //     const arrayBuffer2 = await file2.arrayBuffer();
        //     buffer2 = Buffer.from(arrayBuffer2);
        // }

        await assertResearchCaseScope(actor, parsedErjaId);
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("ErjaId", sql.BigInt, parsedErjaId)
            .input("PasokhSoal1", sql.NVarChar(4000), pasokh1)
            .input("PasokhSoal2", sql.NVarChar(4000), pasokh2)
            .input("PasokhSoal3", sql.NVarChar(4000), pasokh3)
            .input("PasokhSoal4", sql.NVarChar(4000), pasokh4)
            .input("PasokhSoal5", sql.NVarChar(4000), pasokh5)
            .input("PasokhSoal6", sql.NVarChar(4000), pasokh6)
            .input("PasokhSoal7", sql.NVarChar(4000), pasokh7)
            .input("PasokhSoal8", sql.NVarChar(4000), pasokh8)

            .input("Value1", sql.Int, Number(valuesoal1))
            .input("Value2", sql.Int, Number(valuesoal2))
            .input("Value3", sql.Int, Number(valuesoal3))
            .input("Value4", sql.Int, Number(valuesoal4))
            .input("Value5", sql.Int, Number(valuesoal5))
            .input("Value6", sql.Int, Number(valuesoal6))
            .input("Value7", sql.Int, Number(valuesoal7))

            .input("Jambandi", sql.NVarChar(4000), jambandi)
            .input("Page1", sql.NVarChar(200), filepage1)
            .input("Page2", sql.NVarChar(200), filepage2)
            // .input("Files1", sql.VarBinary(sql.MAX), buffer1)
            // .input("Files2", sql.VarBinary(sql.MAX), buffer2)
            .input("UserName", sql.BigInt, Number(userId))
            .execute("Tahghighat.SP_InsertJambandiOstan");

        return researchMutationResponse(result);

    } catch (err) {
        
        return researchAccessResponse(err);
    }
}