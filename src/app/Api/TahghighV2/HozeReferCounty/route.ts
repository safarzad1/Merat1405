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
 
 return respond(await executeMutation("TahghighatV2.SP_HozeReferCounty",q=>q.input("HozeReferralId",sql.BigInt,requiredInt(b.hozeReferralId,"شناسه ارجاع")).input("CountyCityId",sql.Int,requiredInt(b.countyCityId,"شناسه شهرستان")).input("Description",sql.NVarChar(sql.MAX),requiredText(b.description,"شرح ارجاع",6000)).input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
