import { randomUUID } from "crypto";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { authorize, errorResponse, positiveNumber } from "../_shared";

const allowedImage = new Set([".jpg", ".jpeg", ".png"]);
const allowedVideo = new Set([".mp4", ".webm", ".mov", ".m4v"]);
const allowedAudio = new Set([".mp3"]);

export async function POST(req: NextRequest) {
  const denied=authorize(req); if(denied)return denied;
  try {
    const form = await req.formData();
    const shomareKhabar = positiveNumber(form.get("shomareKhabar"), "شماره خبر");
    const userId = positiveNumber(form.get("userId"), "UserId");
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({status:400,error:"فایل ارسال نشده است."},{status:400});
    const ext = path.extname(file.name || "").toLowerCase();
    if (!allowedImage.has(ext) && !allowedVideo.has(ext) && !allowedAudio.has(ext)) return NextResponse.json({status:400,error:"نوع فایل مجاز نیست."},{status:400});
    const maxBytes = allowedVideo.has(ext) ? 10*1024*1024 : 5*1024*1024;
    if (file.size<=0 || file.size>maxBytes) return NextResponse.json({status:400,error:allowedVideo.has(ext)?"حجم ویدئو حداکثر 10MB است.":"حجم فایل حداکثر 5MB است."},{status:400});
    const bytes = Buffer.from(await file.arrayBuffer());
    const storedName = `${randomUUID()}${ext}`;
    const pool = await getConnection();
    const r = await pool.request()
      .input("ShomareKhabar",sql.BigInt,shomareKhabar)
      .input("FileName",sql.NVarChar(250),storedName)
      .input("OriginalFileName",sql.NVarChar(500),String(file.name||"file").slice(0,500))
      .input("Files",sql.VarBinary(sql.MAX),bytes)
      .input("FileSize",sql.Int,Math.ceil(file.size/1024))
      .input("CreateUserId",sql.BigInt,userId)
      .execute("Akhbar.SP_InsertKhabarPeyvast");
    return NextResponse.json({status:200,data:r.recordset?.[0]||null});
  } catch(err){return errorResponse(err)}
}
