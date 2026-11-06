import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, requiredInt, requiredText, jsonBody, requireSameOrigin, respond, action, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req:NextRequest) {
 try { const userId=await authenticatedUserId();
 const id=requiredInt(req.nextUrl.searchParams.get("hozeReferralId"),"شناسه پرونده/تحقیق");
 return respond(await execute("TahghighatV2.SP_GetHozeAssignments", q=>q.input("HozeReferralId",sql.BigInt,id).input("UserId",sql.BigInt,userId)));
 } catch(e) { return fail(e); }
}
