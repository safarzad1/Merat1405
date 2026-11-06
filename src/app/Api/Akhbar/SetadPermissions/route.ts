import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAdminAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";

async function actorForSettings(req: NextRequest, mustAdmin = false) {
  const { actor, isAdmin: admin, pool } = await getAdminAccess(req.cookies.get("token")?.value);
  if (mustAdmin && !admin) throw new Error("FORBIDDEN");
  // Ordinary headquarters users may inspect their own assignment only.
  if (!admin && actor.mahal !== 1) throw new Error("FORBIDDEN");
  const row = (await pool.request().input("UserId", sql.BigInt, actor.userId)
    .query("SELECT TOP(1) PostId FROM dbo.Users WHERE UserId=@UserId AND IsActive=1")).recordset?.[0];
  return { actor, admin, pool, postId: Number(row?.PostId || 0) };
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN";
  const status = message === "UNAUTHORIZED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return NextResponse.json({ status, error: status === 403 ? "مجوز مدیریت اخبار ستاد ندارید." : status === 401 ? "نشست نامعتبر است." : "خطا در دریافت تنظیمات ستاد." }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { actor, admin, pool, postId } = await actorForSettings(req);
    const my = await pool.request().input("UserId", sql.BigInt, actor.userId).query(`
      SELECT CAST([Akhbar].[FN_SetadNewsEnabled](@UserId) AS BIT) AS CanHandle,
             CAST(COALESCE((SELECT AllProvinces FROM Akhbar.SetadNewsPermission WHERE UserId=@UserId),1) AS BIT) AS AllProvinces;
      SELECT ProvinceId FROM Akhbar.SetadNewsProvince WHERE UserId=@UserId`);
    const mySets = Object.values(my.recordsets ?? {});
    if (!admin) return NextResponse.json({ status: 200, admin: false, canHandle: Boolean(mySets[0]?.[0]?.CanHandle),
      allProvinces: Boolean(mySets[0]?.[0]?.AllProvinces), postId, provinces: (mySets[1] || []).map((r: {ProvinceId:number})=>r.ProvinceId) });
    const result = await pool.request().query(`
      SELECT U.UserId,U.PostId,ISNULL(V.FullName,N'') AS FullName, P.OnvanPost,
        CAST([Akhbar].[FN_SetadNewsEnabled](U.UserId) AS BIT) AS CanHandle,
        CAST(COALESCE(X.AllProvinces,1) AS BIT) AS AllProvinces
      FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
      LEFT JOIN dbo.Vbl_Users V ON V.UserId=U.UserId
      LEFT JOIN Akhbar.SetadNewsPermission X ON X.UserId=U.UserId
      WHERE U.IsActive=1 AND U.Mahal=1 AND P.RollId=1 ORDER BY U.PostId,U.UserId;
      SELECT UserId,ProvinceId FROM Akhbar.SetadNewsProvince;
      SELECT CityId AS ProvinceId,Name FROM dbo.Citys WHERE PCityId=1 AND IsActive=1 AND CityId<>108 ORDER BY Name`);
    const sets = Object.values(result.recordsets ?? {});
    return NextResponse.json({ status: 200, admin: true, postId, canHandle: Boolean(mySets[0]?.[0]?.CanHandle), allProvinces: true, provinces: (mySets[1] || []).map((r: {ProvinceId:number})=>r.ProvinceId), users: sets[0] || [], assignments: sets[1] || [], provinceOptions: sets[2] || [] });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const { actor, pool } = await actorForSettings(req,true);
    const input = await req.json();
    const userId = Number(input.userId);
    if (!Number.isSafeInteger(userId) || userId<=0) return NextResponse.json({status:422,error:"کاربر نامعتبر است."},{status:422});
    if (typeof input.canHandle !== "boolean" || typeof input.allProvinces !== "boolean" || !Array.isArray(input.provinces))
      return NextResponse.json({status:422,error:"تنظیمات نامعتبر است."},{status:422});
    const provinceIds: number[] = [...new Set<number>((input.provinces as unknown[]).map((value: unknown) => Number(value)))];
    if (provinceIds.length>40 || provinceIds.some((id)=>!Number.isSafeInteger(id) || id<=0))
      return NextResponse.json({status:422,error:"استان‌های انتخاب‌شده معتبر نیستند."},{status:422});
    if (input.canHandle && !input.allProvinces && provinceIds.length===0)
      return NextResponse.json({status:422,error:"حداقل یک استان را برای این کاربر انتخاب کنید."},{status:422});
    const target = await pool.request().input("UserId",sql.BigInt,userId).query(`
      SELECT TOP(1) U.UserId FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId
      WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1 AND P.RollId=1`);
    if (!target.recordset?.length) return NextResponse.json({status:422,error:"کاربر فعال ستاد یافت نشد."},{status:422});
    if (provinceIds.length) {
      const available = await pool.request().query("SELECT CityId FROM dbo.Citys WHERE PCityId=1 AND IsActive=1 AND CityId<>108");
      const allowed = new Set((available.recordset || []).map((r:{CityId:number})=>Number(r.CityId)));
      if (provinceIds.some(id=>!allowed.has(id))) return NextResponse.json({status:422,error:"یک استان نامعتبر یا غیرفعال انتخاب شده است."},{status:422});
    }
    const tx = new sql.Transaction(pool);
    await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
    try {
      await new sql.Request(tx).input("UserId",sql.BigInt,userId).input("CanHandle",sql.Bit,input.canHandle)
        .input("AllProvinces",sql.Bit,input.allProvinces).input("ActorId",sql.BigInt,actor.userId).query(`
          UPDATE Akhbar.SetadNewsPermission SET CanHandle=@CanHandle,AllProvinces=@AllProvinces,UpdatedBy=@ActorId,UpdatedAt=SYSUTCDATETIME() WHERE UserId=@UserId;
          IF @@ROWCOUNT=0 INSERT INTO Akhbar.SetadNewsPermission(UserId,CanHandle,AllProvinces,UpdatedBy) VALUES(@UserId,@CanHandle,@AllProvinces,@ActorId);
          DELETE FROM Akhbar.SetadNewsProvince WHERE UserId=@UserId;`);
      if (!input.allProvinces) for(const provinceId of provinceIds) {
        await new sql.Request(tx).input("UserId",sql.BigInt,userId).input("ProvinceId",sql.BigInt,provinceId)
          .query("INSERT INTO Akhbar.SetadNewsProvince(UserId,ProvinceId) VALUES (@UserId,@ProvinceId)");
      }
      await tx.commit();
    } catch(error) { await tx.rollback(); throw error; }
    return NextResponse.json({status:200, saved:true});
  } catch(error) { return failure(error); }
}
