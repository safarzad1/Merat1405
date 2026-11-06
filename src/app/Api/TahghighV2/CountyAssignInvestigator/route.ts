import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, action, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req:NextRequest) {
 try {
 requireSameOrigin(req);
 const userId=await authenticatedUserId();
 const b=await jsonBody(req);
 const date=b.dueDatePersian===null||b.dueDatePersian===""||b.dueDatePersian===undefined?null:b.dueDatePersian;
if(date!==null&&(typeof date!=="string"||!/^1[34][0-9]{2}\/(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])$/.test(date)))
throw new ApiError(400,"DATE","تاریخ باید شمسی و در قالب 1405/08/15 باشد.");
 return respond(await executeMutation("TahghighatV2.SP_CountyAssignInvestigator",q=>q.input("CountyReferralId",sql.BigInt,requiredInt(b.countyReferralId,"شناسه ارجاع")).input("PersonId",sql.BigInt,requiredInt(b.personId,"شناسه شخص محقق")).input("Instruction",sql.NVarChar(sql.MAX),requiredText(b.instruction,"شرح مأموریت",6000)).input("UserId",sql.BigInt,userId).input("DueDatePersian",sql.Char(10),date)));
 } catch(e){return fail(e);}
}
