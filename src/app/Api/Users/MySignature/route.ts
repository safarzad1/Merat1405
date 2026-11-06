import { NextRequest, NextResponse } from "next/server";
import { authenticatedUserId, requireSameOrigin } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
const MAX_PNG_BYTES = 524288;
const pngMagic = Buffer.from([137,80,78,71,13,10,26,10]);

async function getUserId() {
  try { return await authenticatedUserId(); }
  catch { return null; }
}

export async function GET() {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ok:false,message:"ابتدا وارد سامانه شوید."},{status:401,headers});
  try {
    const pool = await getMeratPool();
    const result = await pool.request().input("UserId",sql.BigInt,userId)
      .query("SELECT SignaturePng FROM dbo.UserSignature WHERE UserId=@UserId");
    const data = result.recordset?.[0]?.SignaturePng as Buffer | undefined;
    if (!data) return NextResponse.json({ok:false,message:"امضایی ثبت نشده است."},{status:404,headers});
    // Copy into a standalone Uint8Array: Node Buffer's backing store can have an offset.
    return new NextResponse(new Uint8Array(data), {
      status:200,headers:{...headers,"Content-Type":"image/png","Content-Disposition":"inline; filename=signature.png"},
    });
  } catch(error) {
    console.error("MySignature GET",error);
    return NextResponse.json({ok:false,message:"دریافت تصویر امضا ممکن نشد."},{status:500,headers});
  }
}

export async function POST(req:NextRequest) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ok:false,message:"ابتدا وارد سامانه شوید."},{status:401,headers});
  try {requireSameOrigin(req);}
  catch {return NextResponse.json({ok:false,message:"مبدأ درخواست معتبر نیست."},{status:403,headers});}
  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (declaredLength > MAX_PNG_BYTES + 100000) return NextResponse.json({ok:false,message:"حجم تصویر امضا زیاد است."},{status:413,headers});
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("multipart/form-data"))
    return NextResponse.json({ok:false,message:"درخواست بارگذاری معتبر نیست."},{status:415,headers});
  try {
    const form = await req.formData();
    const input = form.get("signature");
    if (!(input instanceof File) || input.type !== "image/png" || input.size < 45 || input.size > MAX_PNG_BYTES)
      return NextResponse.json({ok:false,message:"فقط تصویر PNG معتبر حداکثر ۵۱۲ کیلوبایت مجاز است."},{status:400,headers});
    const image = Buffer.from(await input.arrayBuffer());
    // Check the PNG signature, IHDR header and image dimensions before persisting.
    if (!image.subarray(0,8).equals(pngMagic) || image.toString("ascii",12,16)!=="IHDR" || image.readUInt32BE(8)!==13)
      return NextResponse.json({ok:false,message:"ساختار تصویر PNG معتبر نیست."},{status:400,headers});
    const width = image.readUInt32BE(16),height = image.readUInt32BE(20);
    if (width < 1 || width > 1400 || height < 1 || height > 700)
      return NextResponse.json({ok:false,message:"ابعاد تصویر امضا مجاز نیست."},{status:400,headers});
    const pool = await getMeratPool();
    await pool.request().input("UserId",sql.BigInt,userId)
      .input("SignaturePng",sql.VarBinary(sql.MAX),image).query(`
      SET XACT_ABORT ON;
      BEGIN TRANSACTION;
      IF EXISTS (SELECT 1 FROM dbo.UserSignature WITH (UPDLOCK,HOLDLOCK) WHERE UserId=@UserId)
        UPDATE dbo.UserSignature
        SET SignaturePng=@SignaturePng,UpdatedAtUtc=SYSUTCDATETIME()
        WHERE UserId=@UserId;
      ELSE
        INSERT dbo.UserSignature(UserId,SignaturePng)
        VALUES(@UserId,@SignaturePng);
      COMMIT TRANSACTION;
    `);
    return NextResponse.json({ok:true,message:"امضای شما ثبت شد."},{headers});
  } catch(error) {
    console.error("MySignature POST",error);
    return NextResponse.json({ok:false,message:"ثبت امضا انجام نشد؛ SQL مربوط به پروفایل را بررسی کنید."},{status:500,headers});
  }
}
