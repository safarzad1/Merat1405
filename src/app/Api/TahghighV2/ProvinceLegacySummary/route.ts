import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, ApiError, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const userId=await authenticatedUserId();
    const referralId=requiredInt(req.nextUrl.searchParams.get("referralId"),"ارجاع");
    const rows=await execute("TahghighatV2.SP_GetProvinceSummaryForm", q=>q
      .input("ReferralId",sql.BigInt,referralId).input("UserId",sql.BigInt,userId));
    if(rows.length!==1)throw new ApiError(404,"NOT_FOUND","فرم در محدوده دسترسی شما یافت نشد.");
    return respond(rows);
  }catch(e){return fail(e);}
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId=await authenticatedUserId();
    const body=await jsonBody(req);
    const referralId=requiredInt(body.referralId,"ارجاع");
    const summary=requiredText(body.summaryText,"متن جمع‌بندی",12000);
    if(!Array.isArray(body.selected)||body.selected.length!==7 ||
      body.selected.some((v:unknown)=>!Number.isInteger(v)||Number(v)<0||Number(v)>4))
      throw new ApiError(400,"FORM_OPTIONS","پاسخ گزینه‌های هفت سؤال باید تعیین شود.");
    if(!Array.isArray(body.answers)||body.answers.length!==8 ||
      body.answers.some((v:unknown)=>typeof v!=="string"||v.trim().length===0||v.length>6000))
      throw new ApiError(400,"FORM_ANSWERS","توضیحات هر هشت سؤال باید وارد شود.");
    const rawPages=body.attachmentPageCount;
    const attachmentPageCount=rawPages===null || rawPages===undefined ? null : Number(rawPages);
    if(attachmentPageCount!==null && (!Number.isSafeInteger(attachmentPageCount) || attachmentPageCount<0 || attachmentPageCount>9999))
      throw new ApiError(400,"ATTACHMENT_PAGE_COUNT","تعداد صفحات پیوست باید بین صفر و ۹۹۹۹ باشد.");
    const formJson=JSON.stringify({schemaVersion:1,selected:body.selected,answers:body.answers,summary,attachmentPageCount});
    if(Buffer.byteLength(formJson,"utf8")>45000)throw new ApiError(413,"FORM_SIZE","حجم اطلاعات فرم بیش از حد مجاز است.");
    const rows=await executeMutation("TahghighatV2.SP_SaveProvinceSummaryForm",q=>q
      .input("ReferralId",sql.BigInt,referralId)
      .input("SummaryText",sql.NVarChar(sql.MAX),summary)
      .input("FormDataJson",sql.NVarChar(sql.MAX),formJson)
      .input("UserId",sql.BigInt,userId));
    return respond(rows);
  }catch(e){return fail(e);}
}
