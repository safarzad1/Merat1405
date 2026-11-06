import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req:NextRequest) {
 try {
   const userId=await authenticatedUserId();
   const id=requiredInt(req.nextUrl.searchParams.get("countyReferralId"),"ارجاع شهرستان");
   return respond(await execute("TahghighatV2.SP_GetCountyReplyInvestigatorSummaries",q=>q
      .input("CountyReferralId",sql.BigInt,id).input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}

export async function POST(req:NextRequest) {
 try {
   requireSameOrigin(req);
   const userId=await authenticatedUserId();
   const body=await jsonBody(req);
   const id=requiredInt(body.countyReferralId,"ارجاع شهرستان");
   if(!Array.isArray(body.items)||body.items.length<1||body.items.length>20)
     throw new ApiError(400,"INVALID_ITEMS","حداقل یک و حداکثر بیست جمع‌بندی الزامی است.");
   const ids=new Set<number>();
   const items=body.items.map(item=>{
     if(!item||typeof item!=="object"||Array.isArray(item))
       throw new ApiError(400,"INVALID_ITEMS","ساختار جمع‌بندی معتبر نیست.");
     const record=item as Record<string,unknown>;
     const assignmentId=requiredInt(record.assignmentId,"شناسه محقق");
     if(ids.has(assignmentId))throw new ApiError(400,"DUPLICATE_ITEMS","جمع‌بندی تکراری ارسال شده است.");
     ids.add(assignmentId);
     if(typeof record.summaryText!=="string"||record.summaryText.trim().length<20||record.summaryText.trim().length>6000)
       throw new ApiError(400,"INVALID_SUMMARY","متن هر جمع‌بندی باید بین ۲۰ تا ۶۰۰۰ نویسه باشد.");
     return {assignmentId,summaryText:record.summaryText.trim()};
   });
   return respond(await executeMutation("TahghighatV2.SP_SaveCountyReplyInvestigatorSummaries",q=>q
      .input("CountyReferralId",sql.BigInt,id)
      .input("PayloadJson",sql.NVarChar(sql.MAX),JSON.stringify(items))
      .input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
