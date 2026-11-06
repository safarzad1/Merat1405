import { NextRequest } from "next/server";
import { authenticatedUserId, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { sql } from "@/app/lib/meratV2/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    return respond(await executeMutation("TahghighatV2.SP_SaveReturnedProvinceChildText", q=>q
      .input("ChildReferralId", sql.BigInt, requiredInt(body.childReferralId,"ارجاع استان"))
      .input("SummaryText", sql.NVarChar(sql.MAX), requiredText(body.summaryText,"متن پاسخ اصلاح‌شده",10000))
      .input("UserId", sql.BigInt, userId)));
  } catch(error) { return fail(error); }
}
