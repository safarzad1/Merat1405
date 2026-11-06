import { NextRequest,NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";
export async function POST(req:NextRequest){
 try{
   const actor=await getAuthActor(req.cookies.get("token")?.value);
   const body=await req.json();const newsNo=Number(body.shomareKhabar);
   if(!Number.isSafeInteger(newsNo)||newsNo<=0)return NextResponse.json({status:422,error:"شماره خبر معتبر نیست."},{status:422});
   const pool=await getConnection();
   const result=await pool.request().input("UserId",sql.BigInt,actor.userId).input("ShomareKhabar",sql.BigInt,newsNo)
     .execute("Akhbar.SP_ClaimSetadNews");
   return NextResponse.json({status:200,data:result.recordset?.[0]||null});
 }catch(error){const message=error instanceof Error?error.message:"";const code=message==="UNAUTHORIZED"?401:500;
   return NextResponse.json({status:code,error:code===401?"نشست معتبر نیست.":"امکان تحویل گرفتن خبر وجود ندارد. دسترسی و وضعیت خبر را بررسی کنید."},{status:code});}
}
