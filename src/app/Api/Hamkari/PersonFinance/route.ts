import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const valid = (v: unknown, zero = false) => {
  const n = Number(v);
  return Number.isSafeInteger(n) && (zero ? n >= 0 : n > 0) ? n : null;
};

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized" }, { status: 401 });
  try {
    verifyToken(token);
    const body = await req.json();
    const personId = valid(body.personId);
    const action = String(body.action || "list");
    if (personId === null) return NextResponse.json({ status: 400, error: "شناسه شخص نامعتبر است." }, { status: 400 });
    const pool = await getConnection();
    if (action === "list") {
      const result = await pool.request().input("PersonId", sql.BigInt, personId).execute("Hamkari.SP_GetPersonFinancialProfile");
      const sets = Object.values(result.recordsets ?? {});
      return NextResponse.json({ status: 200, data: { accounts: sets[0] || [], fees: sets[1] || [] } });
    }
    const userId = valid(body.userId);
    const bankAccountId = valid(body.bankAccountId, action === "save");
    if (userId === null || bankAccountId === null) return NextResponse.json({ status: 400, error: "شناسه کاربر یا حساب نامعتبر است." }, { status: 400 });
    const request = pool.request().input("PersonId", sql.BigInt, personId)
      .input("UserId", sql.BigInt, userId).input("BankAccountId", sql.BigInt, bankAccountId);
    if (action === "delete") {
      if (!bankAccountId) return NextResponse.json({ status: 400, error: "شناسه حساب الزامی است." }, { status: 400 });
      const result = await request.execute("Hamkari.SP_DeletePersonBankAccount");
      return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
    }
    if (action !== "save") return NextResponse.json({ status: 400, error: "عملیات نامعتبر است." }, { status: 400 });
    const account = body.account || {};
    request.input("NameBank", sql.Int, account.NameBank ? Number(account.NameBank) : null)
      .input("IsActive", sql.Bit, account.IsActive === false ? false : true);
    for (const [key, max] of Object.entries({ ShomarehHesab: 150, ShomarehKart: 50, ShomarehSheba: 50 })) {
      let value = String(account[key] ?? "").trim();
      if (key === "ShomarehKart" || key === "ShomarehSheba") value = value.replace(/[\s-]/g, "").replace(/[۰-۹]/g, c => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c))).toUpperCase();
      if (value.length > max) return NextResponse.json({ status: 400, error: `طول ${key} نامعتبر است.` }, { status: 400 });
      request.input(key, sql.NVarChar(max), value || null);
    }
    const result = await request.execute("Hamkari.SP_SavePersonBankAccount");
    return NextResponse.json({ status: 200, data: result.recordset?.[0] || {} });
  } catch (error) {
    return NextResponse.json({ status: 500, error: error instanceof Error ? error.message : "خطا در اطلاعات مالی" }, { status: 500 });
  }
}
