import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, requiredInt, requiredText, jsonBody, requireSameOrigin, respond, action, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req:NextRequest) {
 try {requireSameOrigin(req);const userId=await authenticatedUserId();const b=await jsonBody(req);
 
 return respond(await executeMutation("TahghighatV2.SP_HozeCancelAssignment",q=>q.input("AssignmentId",sql.BigInt,requiredInt(b.assignmentId,"انتساب"))
.input("Reason",sql.NVarChar(sql.MAX),requiredText(b.reason,"علت بازپسگیری",6000))
.input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
