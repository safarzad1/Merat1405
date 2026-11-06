import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {
  requireResearchIdentity, requireClaimedActor, positiveId,
  assertResearchCaseScope, researchAccessResponse,
} from "@/lib/researchSecurity";

export async function POST(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const form = await req.formData();
    requireClaimedActor(actor, form.get("userId"));
    const id = positiveId(form.get("karbargId"));
    const fileName = form.get("fileName");
    const file = form.get("file");
    if (!id || typeof fileName !== "string" || !fileName.trim() ||
        fileName.length > 200 || fileName.includes("\0") || !(file instanceof File)) {
      return NextResponse.json({ status: 400, error: "مشخصات فایل یا کاربرگ معتبر نیست." }, { status: 400 });
    }
    if (file.size === 0 || file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ status: 400, error: "حجم فایل باید بین ۱ بایت و ۲ مگابایت باشد." }, { status: 400 });
    }
    const pool = await getConnection();
    const linked = await pool.request().input("KarbargId", sql.BigInt, id)
      .query(`SELECT TOP (1) ErjaId FROM Tahghighat.Erja_Tahghigh_Karbarg
              WHERE KarbargId = @KarbargId AND ISNULL(IsDelete,0) = 0`);
    if (!linked.recordset?.[0]) {
      return NextResponse.json({ status: 404, error: "کاربرگ یافت نشد." }, { status: 404 });
    }
    await assertResearchCaseScope(actor, linked.recordset[0].ErjaId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await pool.request()
      .input("KarbargId", sql.BigInt, id)
      .input("Files", sql.VarBinary(sql.MAX), buffer)
      .input("FileName", sql.NVarChar(200), fileName)
      .input("CreateUserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_InsertTahghighatPeyvast");
    // This stored procedure has no IsSuccess result row; it only inserts the binary.
    if (!(result.rowsAffected ?? []).some((count) => count > 0)) {
      return NextResponse.json({ status: 409, error: "ثبت فایل در پایگاه داده تأیید نشد." }, { status: 409 });
    }
    return NextResponse.json({ status: 200, message: "فایل ذخیره شد." }, { status: 200 });
  } catch (err) {
    return researchAccessResponse(err);
  }
}
