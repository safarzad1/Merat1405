import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
    const body = await req.json();
    const action = String(body?.action || "list");
    const pool = await getConnection();
    if (action === "list") {
      const personId = Number(body.personId);
      if (!Number.isSafeInteger(personId) || personId <= 0) return NextResponse.json({ status: 400, error: "PersonId is invalid" }, { status: 400 });
      const result = await pool.request().input("PersonId", sql.BigInt, personId).execute("Hamkari.SP_GetPersonEvaluations");
      return NextResponse.json({ status: 200, data: result.recordset || [] });
    }
    if (action === "form") {
      const evaluationId = Number(body.evaluationId || 0);
      if (!Number.isSafeInteger(evaluationId) || evaluationId < 0) return NextResponse.json({ status: 400, error: "EvaluationId is invalid" }, { status: 400 });
      const result = await pool.request().input("EvaluationId", sql.BigInt, evaluationId).execute("Hamkari.SP_GetEvaluationForm");
      const sets = Object.values(result.recordsets ?? {});
      return NextResponse.json({ status: 200, data: { template: sets[0]?.[0] || null, questions: sets[1] || [] } });
    }
    if (action === "save") {
      const evaluationId = Number(body.evaluationId || 0);
      const personId = Number(body.personId);
      const templateId = Number(body.templateId);
      const userId = Number(body.userId);
      const answers = body.answers;
      if (![evaluationId, personId, templateId, userId].every(Number.isSafeInteger) || evaluationId < 0 || personId <= 0 || templateId <= 0 || userId <= 0 || !Array.isArray(answers))
        return NextResponse.json({ status: 400, error: "Evaluation input is invalid" }, { status: 400 });
      const result = await pool.request()
        .input("EvaluationId", sql.BigInt, evaluationId)
        .input("PersonId", sql.BigInt, personId)
        .input("TemplateId", sql.BigInt, templateId)
        .input("UserId", sql.BigInt, userId)
        .input("AnswersJson", sql.NVarChar(sql.MAX), JSON.stringify(answers))
        .execute("Hamkari.SP_SavePersonEvaluation");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    if (action === "delete") {
      const evaluationId = Number(body.evaluationId);
      const personId = Number(body.personId);
      const userId = Number(body.userId);
      if (![evaluationId, personId, userId].every(Number.isSafeInteger) || evaluationId <= 0 || personId <= 0 || userId <= 0)
        return NextResponse.json({ status: 400, error: "Evaluation input is invalid" }, { status: 400 });
      const result = await pool.request()
        .input("EvaluationId", sql.BigInt, evaluationId)
        .input("PersonId", sql.BigInt, personId)
        .input("UserId", sql.BigInt, userId)
        .execute("Hamkari.SP_DeletePersonEvaluation");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    return NextResponse.json({ status: 400, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ status: 500, error: error instanceof Error ? error.message : "خطا در ارزیابی" }, { status: 500 });
  }
}
