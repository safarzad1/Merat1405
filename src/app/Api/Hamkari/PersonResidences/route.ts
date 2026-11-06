import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const toId = (value: unknown, allowZero = false) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && (allowZero ? n >= 0 : n > 0) ? n : null;
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
    const body = await req.json();
    const personId = toId(body.personId);
    const action = String(body.action || "list");
    if (personId === null) return NextResponse.json({ status: 400, error: "شناسه شخص معتبر نیست." }, { status: 400 });
    const pool = await getConnection();
    if (action === "list") {
      const result = await pool.request().input("PersonId", sql.BigInt, personId).execute("Hamkari.SP_GetPersonResidences");
      return NextResponse.json({ status: 200, data: result.recordset || [] });
    }
    const userId = toId(body.userId);
    const residenceId = toId(body.residenceId, action === "save");
    if (userId === null || residenceId === null) return NextResponse.json({ status: 400, error: "شناسه کاربر یا سابقه نامعتبر است." }, { status: 400 });
    const request = pool.request().input("PersonId", sql.BigInt, personId)
      .input("ResidenceId", sql.BigInt, residenceId).input("UserId", sql.BigInt, userId);
    if (action === "delete") {
      if (!residenceId) return NextResponse.json({ status: 400, error: "شناسه سابقه الزامی است." }, { status: 400 });
      const result = await request.execute("Hamkari.SP_DeletePersonResidence");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    if (action !== "save") return NextResponse.json({ status: 400, error: "عملیات ناشناخته است." }, { status: 400 });
    const residence = body.residence || {};
    const normalDigits = (v: unknown) => String(v ?? "").replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c))).trim();
    request.input("Vazeyat", sql.Int, residence.Vazeyat ? Number(residence.Vazeyat) : null)
      .input("Mahal", sql.BigInt, residence.Mahal ? Number(residence.Mahal) : null);
    for (const [name, length] of Object.entries({ Tel: 30, AzTarikh: 4, TaTarikh: 4, Neshani: 1000, CodePosti: 10 })) {
      const value = ["AzTarikh", "TaTarikh", "CodePosti"].includes(name) ? normalDigits(residence[name]) : String(residence[name] ?? "").trim();
      if (value.length > length) return NextResponse.json({ status: 400, error: `طول فیلد ${name} بیش از حد مجاز است.` }, { status: 400 });
      request.input(name, sql.NVarChar(length), value || null);
    }
    const result = await request.execute("Hamkari.SP_SavePersonResidence");
    return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
  } catch (error) {
    return NextResponse.json({ status: 500, error: error instanceof Error ? error.message : "خطا در سوابق سکونت" }, { status: 500 });
  }
}
