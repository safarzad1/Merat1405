/**
 * ارزیابی پاسخ عملیات تغییر وضعیت/ارجاع تحقیقات.
 * APIهای مرآت پاسخ را به شکل {status:200,data:recordset} برمی‌گردانند؛
 * وضعیت موفق HTTP الزاماً به معنی موفقیت Stored Procedure نیست.
 */
export type ResearchMutationResponse = {
  status?: number;
  data?: Array<Record<string, unknown>> | { status?: number };
  error?: unknown;
};

function successfulFlag(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

export function isResearchMutationSuccessful(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const response = result as ResearchMutationResponse;
  if (response.status !== 200 || response.error) return false;
  const row = Array.isArray(response.data) ? response.data[0] : undefined;
  if (!row) return true; // SPهای UPDATE ممکن است رکوردی برنگردانند.
  if (Object.prototype.hasOwnProperty.call(row, "IsSuccess")) return successfulFlag(row.IsSuccess);
  if (Object.prototype.hasOwnProperty.call(row, "InSuccess")) return successfulFlag(row.InSuccess);
  return true;
}

export function isResearchDuplicateReferral(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const response = result as ResearchMutationResponse;
  if (response.status !== 200 || !Array.isArray(response.data)) return false;
  const row = response.data[0];
  if (!row) return false;
  const failed = (Object.prototype.hasOwnProperty.call(row, "IsSuccess") && !successfulFlag(row.IsSuccess)) ||
    (Object.prototype.hasOwnProperty.call(row, "InSuccess") && !successfulFlag(row.InSuccess));
  if (!failed) return false;
  // ارجاع محقق Status=201 و ارجاع استان/حوزه Message='ارجاع تکراری می باشد' دارد.
  return Number(row.Status) === 201 || String(row.Message || "").includes("تکراری");
}

export function isResearchSessionExpired(result: unknown): boolean {
  return !!result && typeof result === "object" && (result as ResearchMutationResponse).status === 401;
}
