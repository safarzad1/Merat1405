import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { requireAdmin } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";
const headers = {"Cache-Control":"private, no-store"};
function status(error:unknown){return error instanceof Error && error.message==="UNAUTHORIZED"?401:
 error instanceof Error && error.message==="FORBIDDEN"?403:500;}
export async function GET(req: NextRequest){
 try{
  const {actor,pool}=await requireAdmin(req.cookies.get("token")?.value);
  await pool.request().input("UserId",sql.BigInt,actor.userId)
   .execute("Akhbar.SP_RefreshNewsOverdueAlerts");
  const r=await pool.request().input("AdminUserId",sql.BigInt,actor.userId)
   .execute("Akhbar.SP_GetNewsOverdueManagement");
  const sets = Object.values(r.recordsets ?? {});
  return NextResponse.json({status:200,thresholds:sets[0]||[],
   summary:sets[1]?.[0]||null,alerts:sets[2]||[],events:sets[3]||[]},{headers});
 }catch(e){const s=status(e);return NextResponse.json({error:s===500?"دریافت گزارش هشدارها ممکن نشد؛ SQL فاز ۱۰ را بررسی کنید.":"دسترسی مجاز نیست."},{status:s,headers});}
}
export async function POST(req: NextRequest){
 try{
  const {actor,pool}=await requireAdmin(req.cookies.get("token")?.value);
  const body=await req.json();
  const level=Number(body?.level),hours=Number(body?.hours);
  if(!Number.isInteger(level)||level<1||level>4||!Number.isInteger(hours)||hours<1||hours>720)
   return NextResponse.json({error:"سطح یا آستانه نامعتبر است (۱ تا ۷۲۰ ساعت)."},{status:400,headers});
  await pool.request().input("AdminUserId",sql.BigInt,actor.userId)
   .input("OrgLevel",sql.TinyInt,level).input("HoursLimit",sql.Int,hours)
   .execute("Akhbar.SP_ManageNewsOverdueThreshold");
  return NextResponse.json({status:200,success:true},{headers});
 }catch(e){const s=status(e);return NextResponse.json({error:s===500?"ذخیره آستانه ممکن نشد.":"دسترسی مجاز نیست."},{status:s,headers});}
}
