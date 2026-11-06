import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, action, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req:NextRequest) {
 try {
 requireSameOrigin(req);
 const userId=await authenticatedUserId();
 const b=await jsonBody(req);
 const kind=action(b.actionCode,["COUNTY_INVESTIGATOR_START","COUNTY_INVESTIGATOR_DONE"]);
const summary=kind==="COUNTY_INVESTIGATOR_DONE"?requiredText(b.summary,"جمع‌بندی",6000):null;
 return respond(await executeMutation("TahghighatV2.SP_CountyInvestigatorAction",q=>q.input("AssignmentId",sql.BigInt,requiredInt(b.assignmentId,"شناسه انتساب")).input("ActionCode",sql.VarChar(40),kind).input("UserId",sql.BigInt,userId).input("Summary",sql.NVarChar(sql.MAX),summary)));
 } catch(e){return fail(e);}
}
