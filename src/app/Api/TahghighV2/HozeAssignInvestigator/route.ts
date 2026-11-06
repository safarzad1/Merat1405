import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, requiredInt, requiredText, jsonBody, requireSameOrigin, respond, action, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req:NextRequest) {
 try {requireSameOrigin(req);const userId=await authenticatedUserId();const b=await jsonBody(req);
  if ((b.personId === undefined || b.personId === null) && (b.investigatorKey === undefined || b.investigatorKey === null))
 throw new ApiError(400,"INVESTIGATOR","انتخاب محقق الزامی است.");
  const date=b.dueDatePersian===null||b.dueDatePersian===""||b.dueDatePersian===undefined?null:b.dueDatePersian;
 if(date!==null&&(typeof date!=="string"||!/^1[34][0-9]{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date)))
 throw new ApiError(400,"DATE","تاریخ شمسی معتبر نیست.");
 
 return respond(await executeMutation("TahghighatV2.SP_HozeAssignInvestigator",q=>q.input("HozeReferralId",sql.BigInt,requiredInt(b.hozeReferralId,"ارجاع حوزه"))
.input("PersonId",sql.BigInt,b.personId === undefined || b.personId === null ? null : requiredInt(b.personId,"شناسه هویتی محقق"))
.input("InvestigatorKey",sql.BigInt,b.investigatorKey === undefined || b.investigatorKey === null ? null : requiredInt(b.investigatorKey,"محقق"))
.input("Instruction",sql.NVarChar(sql.MAX),requiredText(b.instruction,"شرح مأموریت",6000))
.input("DueDatePersian",sql.Char(10),date)
.input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
