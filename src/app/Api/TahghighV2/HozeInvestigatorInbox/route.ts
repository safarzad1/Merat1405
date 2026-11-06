import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, requiredInt, requiredText, jsonBody, requireSameOrigin, respond, action, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req:NextRequest) {
 try {const userId=await authenticatedUserId();
 const page=requiredInt(req.nextUrl.searchParams.get("page")||"1","صفحه");
 const pageSize=requiredInt(req.nextUrl.searchParams.get("pageSize")||"25","تعداد");
 return respond(await execute("TahghighatV2.SP_GetHozeInvestigatorInbox", q=>q.input("UserId",sql.BigInt,userId).input("Page",sql.Int,page).input("PageSize",sql.Int,pageSize)));
 } catch(e){return fail(e);}
}
