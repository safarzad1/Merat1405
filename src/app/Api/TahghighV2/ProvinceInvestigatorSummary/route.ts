import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function summaryFail(error:unknown) {
  const e=error as {number?:unknown;originalError?:{info?:{number?:unknown}};message?:unknown};
  const number=typeof e?.number==="number"?e.number:e?.originalError?.info?.number;
  if(typeof number==="number" && number>=56300 && number<56400)
    return fail(new ApiError(409,`SQL_${number}`,String(e.message||"جمع‌بندی معتبر نیست.")));
  return fail(error);
}
export async function GET(req:NextRequest) {
  try {
    const userId=await authenticatedUserId();
    const id=requiredInt(req.nextUrl.searchParams.get("assignmentId"),"شناسه انتساب");
    return respond(await execute("TahghighatV2.SP_GetProvinceInvestigatorSummary",q=>q
      .input("AssignmentId",sql.BigInt,id).input("UserId",sql.BigInt,userId)));
  } catch(e){return summaryFail(e);}
}
export async function POST(req:NextRequest) {
  try {
    requireSameOrigin(req);
    const userId=await authenticatedUserId();const b=await jsonBody(req);
    const assignmentId=requiredInt(b.assignmentId,"شناسه انتساب");
    const text=typeof b.summaryText==="string"?b.summaryText.trim():"";
    if(!text || text.length>12000) throw new ApiError(400,"SUMMARY_TEXT","متن جمع‌بندی بین ۱ تا ۱۲۰۰۰ نویسه الزامی است.");
    return respond(await executeMutation("TahghighatV2.SP_SaveProvinceInvestigatorSummary",q=>q
      .input("AssignmentId",sql.BigInt,assignmentId)
      .input("UserId",sql.BigInt,userId)
      .input("SummaryText",sql.NVarChar(sql.MAX),text)));
  } catch(e){return summaryFail(e);}
}
