import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req: NextRequest){
  try {
    requireSameOrigin(req);
    const userId=await authenticatedUserId();
    const body=await jsonBody(req);
    return respond(await executeMutation("TahghighatV2.SP_DeleteUnattachedInvestigatorWorksheet",q=>q
      .input("WorksheetId",sql.BigInt,requiredInt(body.worksheetId,"شناسه کاربرگ"))
      .input("UserId",sql.BigInt,userId)));
  }catch(error){return fail(error);}
}
