import {NextRequest,NextResponse} from "next/server";
import sql from "mssql";
import {getAuthActor} from "@/lib/userScope";
import {getConnection} from "@/lib/db";
export async function GET(req:NextRequest){
 try{const a=await getAuthActor(req.cookies.get("token")?.value);
 const pool=await getConnection();const u=await pool.request().input("UserId",sql.BigInt,a.userId).query(`SELECT TOP(1) P.RollId FROM dbo.Users U JOIN dbo.Posts P ON P.PostId=U.PostId WHERE U.UserId=@UserId AND U.IsActive=1 AND U.Mahal=1`);
 if(Number(u.recordset?.[0]?.RollId)!==1)return NextResponse.json({error:"دسترسی مجاز نیست"},{status:403});
 const r=await pool.request().query("SELECT CityId AS ProvinceId,Name FROM dbo.Citys WHERE PCityId=1 AND IsActive=1 AND CityId<>108 ORDER BY Name");
 return NextResponse.json({status:200,provinces:r.recordset||[]});
 }catch{return NextResponse.json({status:401,error:"نشست معتبر نیست."},{status:401})}
}
