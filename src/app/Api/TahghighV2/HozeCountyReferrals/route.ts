import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, action, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req:NextRequest) {
 try {
 const userId=await authenticatedUserId();
 const qs=req.nextUrl.searchParams;
 
 return respond(await execute("TahghighatV2.SP_GetHozeCountyReferrals",q=>q.input("HozeReferralId",sql.BigInt,requiredInt(qs.get("hozeReferralId"),"شناسه ارجاع")).input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
