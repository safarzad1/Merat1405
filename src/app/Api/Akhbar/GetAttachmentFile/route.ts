import path from "path";
import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber, assertSessionUser } from "../_shared";
function contentType(name: string) {
  const ext = path.extname(name).toLowerCase();
  const types: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".mp3": "audio/mpeg", ".webm": "video/webm",
    ".mp4": "video/mp4", ".m4v": "video/mp4", ".mov": "video/quicktime",
  };
  return types[ext] || "application/octet-stream";
}
export async function GET(req:NextRequest){const denied=authorize(req);if(denied)return denied;try{const q=req.nextUrl.searchParams;const sh=positiveNumber(q.get("shomareKhabar"),"شماره خبر");const uid=positiveNumber(q.get("userId"),"UserId");await assertSessionUser(req,uid);const fileName=String(q.get("fileName")||"").trim();if(!fileName || fileName.length>250 || /[\\/\r\n]/.test(fileName))return NextResponse.json({status:400,error:"نام فایل نامعتبر است."},{status:400});const pool=await getConnection();const r=await pool.request().input("ShomareKhabar",sql.BigInt,sh).input("FileName",sql.NVarChar(250),fileName).input("UserId",sql.BigInt,uid).execute("Akhbar.SP_GetKhabarPeyvastFile");const row=r.recordset?.[0];if(!row?.Files)return NextResponse.json({status:404,error:"فایل یافت نشد."},{status:404});const body=Buffer.isBuffer(row.Files)?row.Files:Buffer.from(row.Files);return new NextResponse(new Uint8Array(body),{status:200,headers:{"Content-Type":contentType(fileName),"Content-Length":String(body.length),"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff","Content-Disposition":contentType(fileName)==="application/octet-stream"?"attachment":"inline"}});}catch(err){return errorResponse(err)}}
