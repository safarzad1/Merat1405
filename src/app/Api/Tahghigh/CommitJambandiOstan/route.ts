import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { randomUUID } from "node:crypto";
import { getConnection } from "@/lib/db";
import {
  assertResearchCaseScope,
  positiveId,
  requireClaimedActor,
  requireResearchIdentity,
  researchAccessResponse,
  ResearchAccessError,
} from "@/lib/researchSecurity";

// All four writes use a single SQL Server transaction.  The legacy file
// procedure writes to NamehDB on the same SQL instance as MeratDB.  Verify
// that both databases reside on that instance before using this in production.
export const runtime = "nodejs";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_STATES = new Set([6, 8, 10, 12, 15]);

function procedureSucceeded(result: { recordset?: Record<string, unknown>[] }): boolean {
  const rows = result.recordset;
  if (!rows?.length) return false;
  // Do not accept a success row if any returned row explicitly failed.
  return rows.every((row) => {
    const value = row.IsSuccess ?? row.InSuccess ?? row.isSuccess ?? row.inSuccess;
    return value === true || value === 1 || value === "1";
  });
}

function readText(form: FormData, key: string, maximum: number): string | null {
  const value = form.get(key);
  return typeof value === "string" && value.length <= maximum ? value : null;
}

function pngSignature(buffer: Buffer): boolean {
  return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
}

export async function POST(req: NextRequest) {
  let transaction: InstanceType<typeof sql.Transaction> | undefined;
  let committed = false;
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const form = await req.formData();
    requireClaimedActor(actor, form.get("userId"));
    const erjaId = positiveId(form.get("erjaId"));
    const state = Number(form.get("erjaLastState"));
    // Optimistic concurrency token: the case state the operator actually saw.
    // Do not save over a transition performed by another user while the form was open.
    const expectedStateText = form.get("expectedState");
    const expectedState = typeof expectedStateText === "string" && /^\d{1,3}$/.test(expectedStateText)
      ? Number(expectedStateText) : NaN;
    const isDone = form.get("isDone");
    if (!erjaId || !ALLOWED_STATES.has(state) || !Number.isInteger(expectedState) ||
        (isDone !== "true" && isDone !== "false")) {
      return NextResponse.json({ status: 400, error: "وضعیت یا شناسه پرونده معتبر نیست." }, { status: 400 });
    }
    // Keep the finalisation states bound to their expected done flag.
    if ((state === 12 || state === 10) !== (isDone === "true")) {
      return NextResponse.json({ status: 400, error: "وضعیت نهایی‌سازی ناسازگار است." }, { status: 400 });
    }
    await assertResearchCaseScope(actor, erjaId);

    // Match the existing form's visible actions; re-check role on the server.
    const pool = await getConnection();
    const actorRow = await pool.request()
      .input("UserId", sql.BigInt, actor.userId)
      .query("SELECT TOP (1) PostId FROM dbo.Users WHERE UserId=@UserId AND ISNULL(IsActive,1)=1");
    const post = Number(actorRow.recordset?.[0]?.PostId);
    const allowed = (state === 12 && post >= 1 && post <= 5) ||
      (state === 10 && post === 50) ||
      (state === 6 && post === 54) ||
      ([8, 15].includes(state) && [51, 52, 53].includes(post));
    if (!allowed) throw new ResearchAccessError(403, "اجازه انجام این عملیات را ندارید.");

    const answers = Array.from({ length: 8 }, (_, i) => readText(form, `pasokh${i+1}`, 4000));
    const options = Array.from({ length: 7 }, (_, i) => {
      const value = form.get(`valuesoal${i+1}`);
      return typeof value === "string" && /^[0-4]$/.test(value) ? Number(value) : NaN;
    });
    const summary = readText(form, "jambandi", 4000);
    if (answers.some((a) => a === null || !a.trim()) ||
        options.some((x) => !Number.isInteger(x) || x < 0 || x > 4) || summary === null) {
      return NextResponse.json({ status: 400, error: "پاسخ‌های جمع‌بندی ناقص یا نامعتبر است." }, { status: 400 });
    }
    const image1 = form.get("page1");
    const image2 = form.get("page2");
    if (!(image1 instanceof File) || !(image2 instanceof File) ||
        [image1, image2].some((f) => f.size < 8 || f.size > MAX_IMAGE_BYTES || f.type !== "image/png")) {
      return NextResponse.json({ status: 400, error: "دو تصویر PNG با حجم حداکثر ۵ مگابایت لازم است." }, { status: 400 });
    }
    const bytes1 = Buffer.from(await image1.arrayBuffer());
    const bytes2 = Buffer.from(await image2.arrayBuffer());
    if (!pngSignature(bytes1) || !pngSignature(bytes2)) {
      return NextResponse.json({ status: 400, error: "فرمت تصویر معتبر نیست." }, { status: 400 });
    }

    const names = [randomUUID() + ".png", randomUUID() + ".png"];
    transaction = new sql.Transaction(pool);
    await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

    // Lock the active case, preventing two competing finalisations.
    const caseResult = await new sql.Request(transaction)
      .input("ErjaId", sql.BigInt, erjaId)
      .query(`SELECT ErjaId, IsDone, ErjaLastState FROM Tahghighat.Erja WITH (UPDLOCK, HOLDLOCK)
              WHERE ErjaId=@ErjaId AND ISNULL(IsDelete,0)=0`);
    if (caseResult.recordset.length !== 1) {
      throw new ResearchAccessError(403, "پرونده فعال یافت نشد.");
    }
    if (Boolean(caseResult.recordset[0].IsDone) ||
        Number(caseResult.recordset[0].ErjaLastState) !== expectedState) {
      await transaction.rollback();
      transaction = undefined;
      return NextResponse.json({ status: 409, error: "وضعیت پرونده تغییر کرده است؛ لطفاً پرونده را تازه‌سازی کنید." }, { status: 409 });
    }

    for (let i = 0; i < 2; i++) {
      await new sql.Request(transaction)
        .input("FileName", sql.NVarChar(250), names[i])
        .input("Files", sql.VarBinary(sql.MAX), i === 0 ? bytes1 : bytes2)
        .input("CreateUserId", sql.BigInt, actor.userId)
        .execute("dbo.SP_InsertFile");
    }

    const summaryRequest = new sql.Request(transaction)
      .input("ErjaId", sql.BigInt, erjaId);
    for (let i = 0; i < 8; i++) summaryRequest.input(`PasokhSoal${i+1}`, sql.NVarChar(sql.MAX), answers[i]);
    for (let i = 0; i < 7; i++) summaryRequest.input(`Value${i+1}`, sql.Int, options[i]);
    const summaryResult = await summaryRequest
      .input("Jambandi", sql.NVarChar(sql.MAX), summary)
      .input("Page1", sql.NVarChar(200), names[0])
      .input("Page2", sql.NVarChar(200), names[1])
      .input("UserName", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_InsertJambandiOstan");
    if (!procedureSucceeded(summaryResult)) throw new Error("Summary procedure did not confirm success");

    const statusResult = await new sql.Request(transaction)
      .input("ErjaId", sql.BigInt, erjaId)
      .input("IsDone", sql.Int, isDone === "true" ? 1 : 0)
      .input("ErjaLastState", sql.Int, state)
      .input("SharhEghdam", sql.NVarChar(sql.MAX), summary)
      .input("UserId", sql.BigInt, actor.userId)
      .execute("Tahghighat.SP_Update_Erja");
    if (!procedureSucceeded(statusResult)) throw new Error("State procedure did not confirm success");

    await transaction.commit();
    committed = true;
    return NextResponse.json({ status: 200, data: [{ IsSuccess: 1 }], fileNames: names });
  } catch (error) {
    if (transaction && !committed) {
      try { await transaction.rollback(); } catch (rollbackError) { console.error("Finalisation rollback error", rollbackError); }
    }
    return researchAccessResponse(error);
  }
}
