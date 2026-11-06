import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import {authorize,errorResponse,positiveNumber,assertSessionUser,NewsInputError} from "../_shared";

export async function POST(req:NextRequest) {
  const denied=authorize(req); if(denied) return denied;
  try {
    const b=await req.json();
    const userId=positiveNumber(b.userId,"UserId"); await assertSessionUser(req,userId);
    const shomareKhabar=positiveNumber(b.shomareKhabar,"شماره خبر");
    const action=String(b.action||"");
    if(!["add","edit","delete"].includes(action)) throw new NewsInputError("عملیات نامعتبر است.");
    const personId=action==="add"?null:positiveNumber(b.personId,"شناسه شخص");
    const fullName=String(b.fullName||"").replace(/\s+/g," ").trim();
    const fatherName=String(b.fatherName||"").replace(/\s+/g," ").trim();
    if(action!=="delete" && (fullName.length<2 || fullName.length>200 || fatherName.length>100)) throw new NewsInputError("نام کامل باید بین ۲ تا ۲۰۰ حرف و نام پدر حداکثر ۱۰۰ حرف باشد.");
    const pool=await getConnection();
    const result=await pool.request()
      .input("ShomareKhabar",sql.BigInt,shomareKhabar)
      .input("UserId",sql.BigInt,userId)
      .input("PersonId",sql.BigInt,personId)
      .input("Action",sql.VarChar(10),action)
      .input("FullName",sql.NVarChar(200),fullName)
      .input("FatherName",sql.NVarChar(100),fatherName || null)
      .execute("Akhbar.SP_ManageManualKhabarPerson");
    return NextResponse.json({status:200,data:result.recordset?.[0]||null});
  }catch(err){return errorResponse(err);}
}
