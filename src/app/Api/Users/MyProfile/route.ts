import { NextResponse } from "next/server";
import { authenticatedUserId } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store" };

export async function GET() {
  try {
    const userId = await authenticatedUserId();
    const pool = await getMeratPool();
    const result = await pool.request().input("UserId", sql.BigInt, userId).query(`
      SELECT TOP (1)
        u.UserId, COALESCE(NULLIF(LTRIM(RTRIM(CONCAT(p.FirstName,N' ',p.LastName))),N''),N'—') AS FullName,
        COALESCE(NULLIF(LTRIM(RTRIM(p.CodeMelli)),N''),N'—') AS NationalCode,
        COALESCE(NULLIF(LTRIM(RTRIM(p.TelHamrah)),N''),N'—') AS Mobile,
        COALESCE(NULLIF(LTRIM(RTRIM(post.OnvanPost)),N''),N'—') AS Position,
        COALESCE(NULLIF(LTRIM(RTRIM(city.Name)),N''),N'—') AS Location,
        CAST(CASE WHEN sig.UserId IS NULL THEN 0 ELSE 1 END AS BIT) AS HasSignature,
        sig.UpdatedAtUtc AS SignatureUpdatedAtUtc
      FROM dbo.Users u
      LEFT JOIN dbo.Person p ON p.PersonId=u.PersonId
      LEFT JOIN dbo.Posts post ON post.PostId=u.PostId
      LEFT JOIN dbo.Citys city ON city.CityId=u.Mahal
      LEFT JOIN dbo.UserSignature sig ON sig.UserId=u.UserId
      WHERE u.UserId=@UserId AND ISNULL(u.IsActive,0)=1;
    `);
    if (!result.recordset?.length) return NextResponse.json({ok:false,message:"حساب کاربری یافت نشد."},{status:404,headers:noStore});
    const row = result.recordset[0];
    return NextResponse.json({ok:true,profile:{
      userId:String(row.UserId),fullName:row.FullName,nationalCode:row.NationalCode,
      mobile:row.Mobile,position:row.Position,location:row.Location,
      hasSignature:Boolean(row.HasSignature),signatureUpdatedAtUtc:row.SignatureUpdatedAtUtc ?? null,
    }},{headers:noStore});
  } catch(error) {
    if (error instanceof Error && error.message === "نشست معتبر نیست؛ دوباره وارد سامانه شوید.")
      return NextResponse.json({ok:false,message:error.message},{status:401,headers:noStore});
    console.error("MyProfile GET",error);
    return NextResponse.json({ok:false,message:"نمایش پروفایل ممکن نیست. نصب SQL امضای کاربران را بررسی کنید."},{status:500,headers:noStore});
  }
}
