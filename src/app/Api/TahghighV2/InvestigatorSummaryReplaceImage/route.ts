import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, executeMutation, fail, requireSameOrigin, requiredInt } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 3 * 1024 * 1024;
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    if (Number(req.headers.get("content-length") || 0) > MAX_BYTES + 128000)
      throw new ApiError(413,"FILE_SIZE","حجم درخواست بیش از حد مجاز است.");
    if (!(req.headers.get("content-type")||"").toLowerCase().startsWith("multipart/form-data"))
      throw new ApiError(415,"FORM","فرمت درخواست معتبر نیست.");
    const form=await req.formData();
    const assignmentId=requiredInt(form.get("assignmentId"),"شناسه انتساب");
    const scope=form.get("scope");
    if(scope!=="OSTAN" && scope!=="HOZE" && scope!=="COUNTY")
      throw new ApiError(400,"SCOPE","محدوده جمع‌بندی معتبر نیست.");
    const expected=form.get("expectedAttachmentIds");
    if(typeof expected!=="string" || expected.length>1000 ||
      (expected!=="" && (expected.split(",").length>20 || !expected.split(",").every(id=>uuid.test(id)) ||
        new Set(expected.toLowerCase().split(",")).size!==expected.split(",").length)))
      throw new ApiError(400,"DOCUMENT_SET","شناسه اسناد قبلی معتبر نیست.");
    const file=form.get("file");
    if(!(file instanceof File) || file.size<1 || file.size>MAX_BYTES)
      throw new ApiError(413,"FILE_SIZE","تصویر جمع‌بندی باید حداکثر ۳ مگابایت باشد.");
    const name=`JambandiMohaghegh_${assignmentId}.${file.type==="image/png"?"png":"jpg"}`;
    const bytes=Buffer.from(await file.arrayBuffer());
    const mime=file.type;
    if(bytes.length>MAX_BYTES || !(
      (mime==="image/png" && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) ||
      (mime==="image/jpeg" && bytes.subarray(0,3).equals(Buffer.from([255,216,255])))
    )) throw new ApiError(415,"FILE_TYPE","فقط تصویر PNG یا JPEG معتبر پذیرفته می‌شود.");
    const rows=await executeMutation("TahghighatV2.SP_ReplaceInvestigatorSummaryImage",q=>q
      .input("AssignmentId",sql.BigInt,assignmentId)
      .input("Scope",sql.VarChar(10),scope)
      .input("UserId",sql.BigInt,userId)
      .input("ExpectedAttachmentIds",sql.NVarChar(1000),expected)
      .input("OriginalFileName",sql.NVarChar(255),name)
      .input("MimeType",sql.NVarChar(100),mime)
      .input("FileData",sql.VarBinary(sql.MAX),bytes));
    return NextResponse.json({ok:true,data:rows},{headers:{"Cache-Control":"no-store"}});
  }catch(error){return fail(error);}
}
