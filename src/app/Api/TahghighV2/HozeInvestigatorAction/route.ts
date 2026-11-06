import { NextRequest } from "next/server";
import { authenticatedUserId, execute, executeMutation, fail, requiredInt, requiredText, jsonBody, requireSameOrigin, respond, action, ApiError } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req:NextRequest) {
 try {requireSameOrigin(req);const userId=await authenticatedUserId();const b=await jsonBody(req);
 
 return respond(await executeMutation("TahghighatV2.SP_HozeInvestigatorAction",q=>q.input("AssignmentId",sql.BigInt,requiredInt(b.assignmentId,"انتساب"))
.input("ActionCode",sql.VarChar(40),action(b.actionCode,["HOZE_INVESTIGATOR_START","HOZE_INVESTIGATOR_DONE"]))
.input("Summary",sql.NVarChar(sql.MAX),b.summary?requiredText(b.summary,"جمع‌بندی محقق",12000):null)
.input("UserId",sql.BigInt,userId)));
 } catch(e){return fail(e);}
}
