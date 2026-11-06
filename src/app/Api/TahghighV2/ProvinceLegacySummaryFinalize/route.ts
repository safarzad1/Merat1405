import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, ApiError, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:NextRequest){
  try{
    requireSameOrigin(req);
    const userId=await authenticatedUserId();
    const body=await jsonBody(req);
    const referralId=requiredInt(body.referralId,"ارجاع");
    if(!Array.isArray(body.attachmentIds)||body.attachmentIds.length<1||body.attachmentIds.length>30||
      body.attachmentIds.some((id:unknown)=>typeof id!=="string"||
        !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(id)))
      throw new ApiError(400,"IMAGES","شناسه تصاویر ثبت‌شده جمع‌بندی معتبر نیست.");
    const rows=await executeMutation("TahghighatV2.SP_FinalizeProvinceSummaryForm",q=>q
      .input("ReferralId",sql.BigInt,referralId).input("UserId",sql.BigInt,userId)
      .input("AttachmentIdsJson",sql.NVarChar(sql.MAX),JSON.stringify(body.attachmentIds)));
    return respond(rows);
  }catch(e){return fail(e);}
}
