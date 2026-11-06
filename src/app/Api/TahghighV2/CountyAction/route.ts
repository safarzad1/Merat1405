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
 
 return respond(await executeMutation("TahghighatV2.SP_CountyAction",q=>q.input("CountyReferralId",sql.BigInt,requiredInt(b.countyReferralId,"شناسه ارجاع")).input("ActionCode",sql.VarChar(40),action(b.actionCode,["COUNTY_START","COUNTY_REPLY"])).input("Description",sql.NVarChar(sql.MAX),requiredText(b.description,"شرح اقدام",6000)).input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
