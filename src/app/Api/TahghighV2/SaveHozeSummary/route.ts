import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request:NextRequest) {
 try {
  requireSameOrigin(request);
  const userId=await authenticatedUserId();
  const body=await jsonBody(request);
  const id=requiredInt(body.hozeReferralId,"شناسه ارجاع");
  const text=requiredText(body.summaryText,"متن جمع‌بندی",10000);
  if(text.length<20)throw new ApiError(400,"SUMMARY_TOO_SHORT","متن جمع‌بندی حداقل ۲۰ نویسه باشد.");
  return respond(await executeMutation("TahghighatV2.SP_SaveHozeSummary",q=>q.input("HozeReferralId",sql.BigInt,id)
   .input("SummaryText",sql.NVarChar(sql.MAX),text).input("UserId",sql.BigInt,userId)));
 }catch(e){return fail(e);}
}
