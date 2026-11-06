import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, action, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req:NextRequest) {
 try {
 const userId=await authenticatedUserId();
 const qs=req.nextUrl.searchParams;
 const page=qs.has("page")?requiredInt(qs.get("page"),"صفحه"):1;
const pageSize=qs.has("pageSize")?requiredInt(qs.get("pageSize"),"اندازه صفحه"):20;
if(page>100000||pageSize>100) throw new ApiError(400,"PAGINATION","صفحه‌بندی نامعتبر است.");

 return respond(await execute("TahghighatV2.SP_GetCountyInvestigatorInbox",q=>q.input("UserId",sql.BigInt,userId).input("Page",sql.Int,page).input("PageSize",sql.Int,pageSize)));
 } catch(e){return fail(e);}
}
