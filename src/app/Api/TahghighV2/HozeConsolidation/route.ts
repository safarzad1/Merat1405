import { NextRequest } from "next/server";
import { authenticatedUserId, execute, fail, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request:NextRequest) {
 try {
  const userId=await authenticatedUserId();
  const id=requiredInt(request.nextUrl.searchParams.get("hozeReferralId"),"شناسه ارجاع");
  return respond(await execute("TahghighatV2.SP_GetHozeConsolidation",q=>q.input("HozeReferralId",sql.BigInt,id).input("UserId",sql.BigInt,userId)));
 }catch(e){return fail(e);}
}
