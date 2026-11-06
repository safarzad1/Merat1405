import { NextRequest } from "next/server";
import { ApiError, authenticatedUserId, execute, executeMutation, fail, jsonBody, requireSameOrigin, requiredInt, requiredText, respond } from "@/app/lib/meratV2/api";
import { getMeratPool, sql } from "@/app/lib/meratV2/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function worksheetFail(error: unknown) {
  const e = error as { number?: unknown; originalError?: { info?: { number?: unknown } }; message?: unknown };
  const sqlNumber = typeof e?.number === "number" ? e.number : e?.originalError?.info?.number;
  if (typeof sqlNumber === "number" && sqlNumber >= 55900 && sqlNumber <= 55999)
    return fail(new ApiError(409, `SQL_${sqlNumber}`, String(e.message || "اطلاعات کاربرگ معتبر نیست.")));
  return fail(error);
}

const optionalText = (value: unknown, name: string, max: number): string | null => {
  if (value == null || value === "") return null;
  if (typeof value !== "string" || value.length > max)
    throw new ApiError(400, "INVALID_INPUT", `${name} نامعتبر یا طولانی است.`);
  return value.trim() || null;
};
const optionalPositive = (value: unknown, name: string): number | null =>
  value == null || value === "" ? null : requiredInt(value, name);
const optionalNonNegative = (value: unknown, name: string): number | null => {
  if (value == null || value === "") return null;
  const valueNumber = typeof value === "number" ? value : typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isSafeInteger(valueNumber) || valueNumber < 0 || valueNumber > 9999)
    throw new ApiError(400, "INVALID_INPUT", `${name} باید بین صفر تا ۹۹۹۹ باشد.`);
  return valueNumber;
};

export async function GET(req: NextRequest) {
  try {
    const userId = await authenticatedUserId();
    const assignmentId = requiredInt(req.nextUrl.searchParams.get("assignmentId"), "شناسه انتساب");
    if (req.nextUrl.searchParams.get("kind") !== "options") {
      return respond(await execute("TahghighatV2.SP_GetProvinceInvestigatorWorksheets", q => q
        .input("AssignmentId", sql.BigInt, assignmentId)
        .input("UserId", sql.BigInt, userId)));
    }

    const pool = await getMeratPool();
    // Derive election, province and authorization from the logged-in account.
    // The client must never supply the province or election code.
    const check = await pool.request()
      .input("AssignmentId", sql.BigInt, assignmentId)
      .input("UserId", sql.BigInt, userId)
      .query(`
        SELECT TOP (1) cf.CodeEntekhabat AS ElectionCode, CONVERT(int,u.Mahal) AS Province
        FROM dbo.Users u
        JOIN TahghighatV2.ResearchAssignment a ON a.AssignmentId = @AssignmentId
        JOIN TahghighatV2.Referral r ON r.ReferralId = a.ReferralId
          AND r.ToMahal = u.Mahal AND r.ReceiverLevel = 'OSTAN' AND r.IsDeleted = 0
        JOIN TahghighatV2.CaseFile cf ON cf.CaseId = r.CaseId
        JOIN dbo.Citys city ON city.CityId = u.Mahal AND city.PCityId = 1 AND city.IsActive = 1
        WHERE u.UserId = @UserId AND u.IsActive = 1 AND u.PostId IN (51,52)
          AND EXISTS (SELECT 1 FROM TahghighatV2.PostActionPermission x
            WHERE x.PostId = u.PostId AND x.ActionCode='ASSIGN_INVESTIGATOR' AND x.IsAllowed=1);
      `);
    const context = check.recordset?.[0] as { Province?: number; ElectionCode?: number } | undefined;
    if (!context || !context.Province || !context.ElectionCode)
      throw new ApiError(403, "WORKSHEET_SCOPE", "دسترسی به اطلاعات این کاربرگ برای کاربر استان مجاز نیست.");

    const [lookups, legacySources] = await Promise.all([
      pool.request().query(`
        SELECT CONVERT(varchar(16),d.PID) AS Kind, CONVERT(bigint,d.Value) AS Value,
               d.NameFarsi AS Title
        FROM dbo.DFN d WHERE d.PID IN(102,111,113,114)
        ORDER BY d.PID,d.Value;
      `),
      pool.request()
        .input("CodeEntekhabat", sql.Int, context.ElectionCode)
        .input("Mahal", sql.Int, context.Province)
        .input("NoeHamkari", sql.Int, 4)
        .input("Vije", sql.Int, 2)
        .execute("Tahghighat.SP_Get_MohagheghInEntekhabat")
    ]);
    const options: Record<string,unknown>[] = (lookups.recordset ?? []).map(r => ({...r}));
    const seen = new Set<string>();
    for (const item of legacySources.recordset ?? []) {
      const id = Number(item.ShomarehParvandeh);
      if (!Number.isSafeInteger(id) || id <= 0 || seen.has(String(id))) continue;
      seen.add(String(id));
      options.push({ Kind: "SOURCE", Value: id, Title: String(item.FullName ?? `منبع ${id}`) });
    }
    return respond(options);
  } catch (error) { return worksheetFail(error); }
}

export async function POST(req: NextRequest) {
  try {
    requireSameOrigin(req);
    const userId = await authenticatedUserId();
    const b = await jsonBody(req);
    return respond(await executeMutation("TahghighatV2.SP_SaveProvinceInvestigatorWorksheet", q => q
      .input("AssignmentId", sql.BigInt, requiredInt(b.assignmentId, "شناسه انتساب"))
      .input("UserId", sql.BigInt, userId)
      .input("WorksheetId", sql.BigInt, optionalPositive(b.worksheetId, "شناسه کاربرگ"))
      .input("TahghighType", sql.Int, requiredInt(b.tahghighType, "نوع کاربرگ"))
      .input("TypeMahalTahghigh", sql.Int, requiredInt(b.typeMahalTahghigh, "محل تحقیق"))
      .input("AzSal", sql.Int, requiredInt(b.azSal, "سال شروع آشنایی"))
      .input("TaSal", sql.Int, requiredInt(b.taSal, "سال پایان آشنایی"))
      .input("CodeManba", sql.BigInt, optionalPositive(b.codeManba, "منبع تحقیق"))
      .input("NahveAshnai", sql.NVarChar(200), requiredText(b.nahveAshnai, "نحوه آشنایی", 200))
      .input("NoeParvandeh", sql.Int, optionalPositive(b.noeParvandeh, "نوع پرونده"))
      .input("NahveBazkhani", sql.Int, optionalPositive(b.nahveBazkhani, "نحوه بازخوانی"))
      .input("NameSazman", sql.NVarChar(300), optionalText(b.nameSazman, "نام سازمان", 300))
      .input("NameShahr", sql.NVarChar(300), optionalText(b.nameShahr, "نام شهر", 300))
      .input("PeyvastCount", sql.Int, optionalNonNegative(b.peyvastCount, "تعداد پیوست"))
      .input("Description", sql.NVarChar(sql.MAX), optionalText(b.description, "توضیحات", 12000))));
  } catch (error) { return worksheetFail(error); }
}
