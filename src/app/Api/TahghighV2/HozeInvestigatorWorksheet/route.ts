import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const optionalText = (v: unknown, name: string, limit: number): string | null => {
  if (v == null || v === "") return null;
  if (typeof v !== "string" || v.length > limit) throw new ApiError(400, "INVALID_INPUT", `${name} نامعتبر است.`);
  return v.trim() || null;
};
const positiveOrNull = (v: unknown, name: string) => v == null || v === "" ? null : requiredInt(v, name);
const nonnegativeOrNull = (v: unknown, name: string) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN;
  if (!Number.isSafeInteger(n) || n < 0 || n > 9999) throw new ApiError(400, "INVALID_INPUT", `${name} باید بین صفر و ۹۹۹۹ باشد.`);
  return n;
};

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const assignmentId = requiredInt(req.nextUrl.searchParams.get("assignmentId"), "شناسه انتساب");
    if (req.nextUrl.searchParams.get("kind") !== "options") {
      return respond(await execute("TahghighatV2.SP_GetHozeInvestigatorWorksheetDetails", q => q
        .input("AssignmentId", sql.BigInt, assignmentId)
        .input("UserId", sql.BigInt, userId)));
    }
    // Both the constituency and election are obtained server-side from the
    // assignment, never from a mutable field in the browser.
    const pool = await getMeratPool();
    const check = await pool.request()
      .input("AssignmentId", sql.BigInt, assignmentId)
      .input("UserId", sql.BigInt, userId)
      .query(`
        SELECT TOP(1) cf.CodeEntekhabat ElectionCode, c.PCityId Province, r.ToMahal HozeCityId
        FROM TahghighatV2.ResearchAssignment a
        JOIN TahghighatV2.Referral r ON r.ReferralId=a.ReferralId
          AND r.ReceiverLevel='HOZE' AND r.IsDeleted=0
        JOIN TahghighatV2.CaseFile cf ON cf.CaseId=r.CaseId
        JOIN dbo.Citys c ON c.CityId=r.ToMahal AND c.IsHoze=1 AND c.IsActive=1
        JOIN dbo.Users u ON u.UserId=@UserId AND u.IsActive=1
          AND u.PostId IN(60,61) AND u.Mahal=r.ToMahal
        WHERE a.AssignmentId=@AssignmentId;
      `);
    const context = check.recordset?.[0] as { ElectionCode?: number; Province?: number; HozeCityId?: number } | undefined;
    if (!context) throw new ApiError(403, "WORKSHEET_SCOPE", "دسترسی به فرم کاربرگ این محقق حوزه مجاز نیست.");
    const lookup = await pool.request().query(`
      SELECT CONVERT(varchar(16),PID) Kind,CONVERT(bigint,Value) Value,NameFarsi Title
      FROM dbo.DFN WHERE PID IN(102,111,113,114) ORDER BY PID,Value;
    `);
    const result: Record<string, unknown>[] = (lookup.recordset ?? []).map(r => ({ ...r }));
    // Source picker uses the same legacy source directory as the provincial
    // form, scoped to the case's province/election instead of user input.
    if (context.ElectionCode && context.Province) {
      const sources = await pool.request()
        .input("CodeEntekhabat", sql.Int, context.ElectionCode)
        .input("Mahal", sql.Int, context.Province)
        .input("NoeHamkari", sql.Int, 4)
        .input("Vije", sql.Int, 2)
        .execute("Tahghighat.SP_Get_MohagheghInEntekhabat");
      const seen = new Set<string>();
      for (const person of sources.recordset ?? []) {
        const id = Number(person.ShomarehParvandeh);
        if (!Number.isSafeInteger(id) || id <= 0 || seen.has(String(id))) continue;
        seen.add(String(id));
        result.push({ Kind: "SOURCE", Value: id, Title: String(person.FullName ?? `منبع ${id}`) });
      }
    }
    return respond(result);
  } catch (e) { return fail(e); }
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const body = await jsonBody(req);
    return respond(await executeMutation("TahghighatV2.SP_SaveHozeInvestigatorWorksheetDetails", q => q
      .input("AssignmentId", sql.BigInt, requiredInt(body.assignmentId, "شناسه انتساب"))
      .input("UserId", sql.BigInt, userId)
      .input("WorksheetId", sql.BigInt, positiveOrNull(body.worksheetId, "شناسه کاربرگ"))
      .input("TahghighType", sql.Int, requiredInt(body.tahghighType, "نوع کاربرگ تحقیق"))
      .input("TypeMahalTahghigh", sql.Int, requiredInt(body.typeMahalTahghigh, "محل تحقیق"))
      .input("CodeManba", sql.BigInt, positiveOrNull(body.codeManba, "منبع تحقیق"))
      .input("NahveAshnai", sql.NVarChar(200), requiredText(body.nahveAshnai, "نحوه آشنایی", 200))
      .input("AzSal", sql.Int, requiredInt(body.azSal, "از سال"))
      .input("TaSal", sql.Int, requiredInt(body.taSal, "تا سال"))
      .input("NoeParvandeh", sql.Int, positiveOrNull(body.noeParvandeh, "نوع پرونده"))
      .input("NahveBazkhani", sql.Int, positiveOrNull(body.nahveBazkhani, "نحوه بازخوانی"))
      .input("NameSazman", sql.NVarChar(300), optionalText(body.nameSazman, "نام سازمان", 300))
      .input("NameShahr", sql.NVarChar(300), optionalText(body.nameShahr, "نام شهر", 300))
      .input("PeyvastCount", sql.Int, nonnegativeOrNull(body.peyvastCount, "تعداد پیوست"))
      .input("Description", sql.NVarChar(sql.MAX), optionalText(body.description, "توضیحات کاربرگ", 12000))));
  } catch (e) { return fail(e); }
}
