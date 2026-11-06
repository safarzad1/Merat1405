import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { getAuthActor } from "@/lib/userScope";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const digits = (v:string) => v.replace(/[۰-۹٠-٩]/g,c=>String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)>=0?"۰۱۲۳۴۵۶۷۸۹".indexOf(c):"٠١٢٣٤٥٦٧٨٩".indexOf(c)));
async function session(req:NextRequest){
 if(req.cookies.get("merat-new-session")?.value!=="1")throw new Error("UNAUTHORIZED");
 return (await getAuthActor(req.cookies.get("token")?.value)).userId;
}
function fail(e:unknown){
 const msg=e instanceof Error?e.message:String(e);
 console.error("TaskManagementV2 review",e);
 const denied=/57501|57513|مجوز|مجاز نیست/.test(msg);
 const known=/5751[01234]|شناسه گزارش|دلیل متنی/.test(msg)||denied;
 return NextResponse.json({error:known?(msg.match(/[^\r\n]*[\u0600-\u06FF][^\r\n]*/)?.[0]??"درخواست معتبر نیست."):"خطا در بررسی عملکرد؛ نصب SQL فاز پنجم را بررسی کنید."},{status:denied?403:known?409:500,headers});
}
export async function GET(req:NextRequest){
 let userId:number;
 try{userId=await session(req);}catch{return NextResponse.json({error:"نشست کاربر معتبر نیست."},{status:401,headers});}
 try{
  const pool=await getConnection();
  const result=await pool.request().input("UserId",sql.BigInt,userId).execute("TaskManagementV2.SP_GetProgressReviewInbox");
  return NextResponse.json({summary:result.recordsets?.[0]?.[0]??{PendingCount:0,PendingValue:0},rows:result.recordsets?.[1]??[]},{headers});
 }catch(e){return fail(e);}
}
export async function POST(req:NextRequest){
 let userId:number;
 try{userId=await session(req);}catch{return NextResponse.json({error:"نشست کاربر معتبر نیست."},{status:401,headers});}
 try{
  const body:unknown=await req.json();
  if(!body||typeof body!=="object"||Array.isArray(body))return NextResponse.json({error:"درخواست نامعتبر است."},{status:400,headers});
  const data=body as Record<string,unknown>;
  const recordId=Number(typeof data.recordId==="string"?digits(data.recordId):data.recordId);
  if(!Number.isSafeInteger(recordId)||recordId<=0)return NextResponse.json({error:"شناسه گزارش معتبر نیست."},{status:400,headers});
  if(data.decision!=="APPROVED"&&data.decision!=="REJECTED")return NextResponse.json({error:"تصمیم نامعتبر است."},{status:400,headers});
  const reason=typeof data.reason==="string"?data.reason.trim():"";
  if(data.decision==="REJECTED"&&(reason.length<5||reason.length>2000))return NextResponse.json({error:"برای برگشت گزارش، دلیل متنی حداقل ۵ و حداکثر ۲۰۰۰ نویسه ضروری است."},{status:400,headers});
  const pool=await getConnection();
  const result=await pool.request().input("UserId",sql.BigInt,userId).input("RecordId",sql.BigInt,recordId)
   .input("Decision",sql.VarChar(12),data.decision).input("Reason",sql.NVarChar(2000),data.decision==="REJECTED"?reason:null)
   .execute("TaskManagementV2.SP_ReviewProgress");
  return NextResponse.json({success:true,result:result.recordset?.[0]??null},{headers});
 }catch(e){return fail(e);}
}
