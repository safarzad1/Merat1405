import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const validId = (value: unknown, allowZero = false) => {
  const n = Number(value);
  return Number.isSafeInteger(n) && (allowZero ? n >= 0 : n > 0) ? n : null;
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
    const body = await req.json();
    const action = String(body.action || "list");
    const personId = validId(body.personId);
    if (personId === null) return NextResponse.json({ status: 400, error: "شناسه شخص معتبر نیست." }, { status: 400 });
    const pool = await getConnection();
    if (action === "list") {
      const result = await pool.request().input("PersonId", sql.BigInt, personId).execute("Hamkari.SP_GetPersonJobs");
      return NextResponse.json({ status: 200, data: result.recordset || [] });
    }
    const userId = validId(body.userId);
    const jobId = validId(body.jobId, action === "save");
    if (userId === null || jobId === null) return NextResponse.json({ status: 400, error: "شناسه کاربر یا سابقه نامعتبر است." }, { status: 400 });
    if (action === "delete") {
      if (!jobId) return NextResponse.json({ status: 400, error: "شناسه سابقه الزامی است." }, { status: 400 });
      const result = await pool.request().input("JobId", sql.BigInt, jobId).input("PersonId", sql.BigInt, personId)
        .input("UserId", sql.BigInt, userId).execute("Hamkari.SP_DeletePersonJob");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    if (action === "save") {
      const value = body.job || {};
      const status = validId(value.Vazeyat);
      if (status === null || !String(value.NameShoghl || "").trim())
        return NextResponse.json({ status: 400, error: "وضعیت و نام شغل الزامی است." }, { status: 400 });
      const request = pool.request().input("JobId", sql.BigInt, jobId).input("PersonId", sql.BigInt, personId)
        .input("Vazeyat", sql.Int, status).input("UserId", sql.BigInt, userId);
      for (const field of ["VazeyatShoghl", "NoeSazman", "SathSazmani", "PostSazmani"])
        request.input(field, sql.Int, value[field] ? Number(value[field]) : null);
      request.input("Mahal", sql.BigInt, value.Mahal ? Number(value.Mahal) : null);
      for (const [field, length] of Object.entries({ Semat: 150, NameShoghl: 250, OnvanMasoliat: 250, AzTarikh: 10, TaTarikh: 10, Neshani: 1500, PhoneNumber: 50, Tozihat: 2500 })) {
        const str = String(value[field] ?? "").trim();
        if (str.length > length) return NextResponse.json({ status: 400, error: `طول فیلد ${field} بیش از حد مجاز است.` }, { status: 400 });
        request.input(field, sql.NVarChar(length), str || null);
      }
      const result = await request.execute("Hamkari.SP_SavePersonJob");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    return NextResponse.json({ status: 400, error: "عملیات ناشناخته است." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ status: 500, error: error instanceof Error ? error.message : "خطا در سوابق شغلی" }, { status: 500 });
  }
}
