import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const asId = (value: unknown, zero = false) => {
  const number = Number(value);
  return Number.isSafeInteger(number) && (zero ? number >= 0 : number > 0) ? number : null;
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
    const body = await req.json();
    const action = String(body.action || "list");
    const personId = asId(body.personId);
    if (personId === null) return NextResponse.json({ status: 400, error: "شناسه فرد نامعتبر است." }, { status: 400 });
    const pool = await getConnection();
    if (action === "list") {
      const result = await pool.request().input("PersonId",sql.BigInt,personId).execute("Hamkari.SP_GetPersonEducations");
      return NextResponse.json({ status: 200, data: result.recordset || [] });
    }
    const userId = asId(body.userId);
    const educationId = asId(body.educationId, action === "save");
    if (userId === null || educationId === null) return NextResponse.json({ status: 400, error: "شناسه ثبت‌کننده یا سابقه نامعتبر است." }, { status: 400 });
    const request = pool.request().input("PersonId",sql.BigInt,personId)
      .input("EducationId",sql.BigInt,educationId).input("UserId",sql.BigInt,userId);
    if (action === "delete") {
      if (!educationId) return NextResponse.json({ status: 400, error: "شناسه سابقه نامعتبر است." }, { status: 400 });
      const result = await request.execute("Hamkari.SP_DeletePersonEducation");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    if (action !== "save") return NextResponse.json({ status: 400, error: "عملیات نامعتبر است." }, { status: 400 });
    const education = body.education || {};
    const type = asId(education.NoeTahsilat);
    if (type === null) return NextResponse.json({ status: 400, error: "نوع تحصیل را مشخص کنید." }, { status: 400 });
    request.input("NoeTahsilat",sql.Int,type);
    for (const name of ["VazeyatTahsil","MadrakTahsili","NoeDaneshgah","NoeGroupTahsili","GroupTahsili","SalAkhzMadrak"])
      request.input(name,sql.Int,education[name] === "" || education[name] == null || Number(education[name]) === 0 ? null : Number(education[name]));
    request.input("MahalTahsil",sql.BigInt,education.MahalTahsil ? Number(education.MahalTahsil) : null);
    for (const [name,length] of Object.entries({ ReshteTahsili:150,NameMahalTahsilStr:150,Neshani:1000 })) {
      const value = String(education[name] ?? "").trim();
      if (value.length > length) return NextResponse.json({ status: 400, error: `متن ${name} طولانی است.` }, { status: 400 });
      request.input(name,sql.NVarChar(length),value || null);
    }
    const result = await request.execute("Hamkari.SP_SavePersonEducation");
    return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
  } catch(error) {
    return NextResponse.json({ status: 500, error: error instanceof Error ? error.message : "خطا در سوابق تحصیلی" }, { status: 500 });
  }
}
