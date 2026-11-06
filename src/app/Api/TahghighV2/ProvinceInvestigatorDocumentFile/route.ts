import { NextRequest, NextResponse } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, requireSameOrigin } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const uuid = /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i;
function failFile(error: unknown) {
  const e = error as {number?: unknown; originalError?: {info?: {number?: unknown}}; message?: unknown};
  const code = typeof e?.number === "number" ? e.number : e?.originalError?.info?.number;
  if (typeof code === "number" && code >= 56300 && code < 56400)
    return fail(new ApiError(409, `SQL_${code}`, String(e.message || "عملیات فایل مجاز نیست.")));
  return fail(error);
}
function getId(req:NextRequest) {
  const id=req.nextUrl.searchParams.get("attachmentId");
  if (!id || !uuid.test(id)) throw new ApiError(400, "FILE_ID", "شناسه فایل معتبر نیست.");
  return id;
}
export async function GET(req:NextRequest) {
  try {
    const userId=await authenticatedUserId(); const id=getId(req);
    const rows=await execute("TahghighatV2.SP_GetProvinceInvestigatorDocumentFile", q=>q
      .input("AttachmentId",sql.UniqueIdentifier,id).input("UserId",sql.BigInt,userId));
    const doc=rows[0];
    if (!doc || !(doc.FileData instanceof Uint8Array)) throw new ApiError(404,"NOT_FOUND","فایل یافت نشد یا مجوز مشاهده ندارید.");
    const bytes=new Uint8Array(doc.FileData);
    const mime=String(doc.MimeType);
    if (!["image/jpeg","image/png","image/webp","application/pdf"].includes(mime))
      throw new ApiError(415,"FILE_TYPE","نوع فایل معتبر نیست.");
    const safeName=String(doc.OriginalFileName||"attachment").replace(/[\r\n\\/]/g, "_").slice(0,255);
    const download=req.nextUrl.searchParams.get("download")==="1";
    return new NextResponse(bytes, {headers:{
      "Content-Type":mime,
      "Content-Length":String(bytes.byteLength),
      "Content-Disposition":`${download?"attachment":"inline"}; filename*=UTF-8''${encodeURIComponent(safeName)}`,
      "X-Content-Type-Options":"nosniff",
      "Content-Security-Policy":"sandbox",
      "Cache-Control":"private, no-store, max-age=0",
    }});
  } catch(e) {return failFile(e);}
}
export async function DELETE(req:NextRequest) {
  try {
    requireSameOrigin(req);
    const userId=await authenticatedUserId(); const id=getId(req);
    // The confirmation dialog no longer asks for a free-text reason.
    // Preserve the existing SQL audit field with a server-generated value.
    const reason="حذف پیوست با تأیید کاربر";
    await executeMutation("TahghighatV2.SP_DeleteProvinceInvestigatorDocument",q=>q
      .input("AttachmentId",sql.UniqueIdentifier,id)
      .input("UserId",sql.BigInt,userId)
      .input("Reason",sql.NVarChar(500),reason));
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  } catch(e) {return failFile(e);}
}
