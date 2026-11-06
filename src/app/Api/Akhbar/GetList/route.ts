import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser, NewsInputError } from "../_shared";
export async function POST(req: NextRequest) {
  const denied=authorize(req); if(denied)return denied;
  try {
    const b=await req.json(); await assertSessionUser(req,positiveNumber(b.userId,"UserId"));
    const page=Number(b.page ?? 1),size=Number(b.sizePage ?? 20);
    const sort=Number(b.sortIndex ?? 1), direction=Number(b.sortDirection ?? 2);
    const box=Number(b.boxType ?? 1), province=Number(b.filterProvince ?? 0);
    const search=String(b.search || ""), filterStatus=String(b.filterStatus || "").trim();
    const from=String(b.dateFrom || "").trim(), to=String(b.dateTo || "").trim();
    const dateOK=(v:string)=>!v || /^1[34]\d{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.test(v);
    if(!Number.isSafeInteger(page)||page<1||page>100000 ||
       !Number.isSafeInteger(size)||size<1||size>100 ||
       !Number.isInteger(sort)||sort<1||sort>5 || ![1,2].includes(direction) ||
       ![1,2,3,4,5].includes(box) || !Number.isSafeInteger(province)||province<0 ||
       search.length>200 || filterStatus.length>60 || !dateOK(from)||!dateOK(to)||(from&&to&&from>to))
      throw new NewsInputError("فیلتر یا صفحه‌بندی اخبار نامعتبر است.");
    const pool=await getConnection(); const r=await pool.request()
    .input("UserId",sql.BigInt,positiveNumber(b.userId,"UserId"))
    .input("Page",sql.Int,page)
    .input("SizePage",sql.Int,size)
    .input("SortIndex",sql.Int,sort)
    .input("SECDEC",sql.Int,direction)
    .input("Search",sql.NVarChar(200),search)
    .input("BoxType",sql.Int,box)
    .input("FilterProvince",sql.Int,province||null)
    .input("FilterStatus",sql.NVarChar(60),filterStatus||null)
    .input("DateFrom",sql.NVarChar(10),from||null)
    .input("DateTo",sql.NVarChar(10),to||null)
    .execute("Akhbar.SP_GetKhabarPage"); return NextResponse.json({status:200,data:r.recordset||[]}); } catch(err){return errorResponse(err);}
}
