import sql from "mssql";
import { getConnection } from "@/lib/db";
import { isMahalInScope } from "@/lib/userScope";
import { NextResponse } from "next/server";
import { getAuthActor } from "@/lib/userScope";

// A verified, active user must be the person recorded as the actor.
// This is identity validation, not a substitute for per-case authorization.
export class ResearchAccessError extends Error {
  constructor(public readonly httpStatus: 401 | 403, message: string) {
    super(message);
    this.name = "ResearchAccessError";
  }
}

export function positiveId(value: unknown): number | null {
  if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function requireResearchIdentity(token: string | undefined, claimedId?: unknown) {
  if (!token) throw new ResearchAccessError(401, "برای ادامه، وارد سامانه شوید.");
  let actor;
  try {
    actor = await getAuthActor(token);
  } catch (error) {
    if (error instanceof Error && error.message !== "UNAUTHORIZED" && !["TokenExpiredError", "JsonWebTokenError", "NotBeforeError"].includes(error.name)) throw error;
    throw new ResearchAccessError(401, "نشست کاربر معتبر نیست یا حساب غیرفعال است.");
  }
  if (!positiveId(actor.userId)) throw new ResearchAccessError(401, "شناسه کاربر معتبر نیست.");
  if (claimedId !== undefined) requireClaimedActor(actor, claimedId);
  return actor;
}

export function requireClaimedActor(actor: { userId: number }, claimedId: unknown) {
  if (positiveId(claimedId) !== actor.userId) {
    throw new ResearchAccessError(403, "شناسه کاربر با نشست فعلی مطابقت ندارد.");
  }
}

export function researchAccessResponse(error: unknown) {
  if (error instanceof ResearchAccessError) {
    return NextResponse.json({ status: error.httpStatus, error: error.message }, { status: error.httpStatus });
  }
  // Do not expose SQL error details or secrets to clients.
  console.error("Research API error:", error);
  return NextResponse.json({ status: 500, error: "خطای داخلی در انجام عملیات" }, { status: 500 });
}

export function researchMutationResponse(result: { recordset?: Record<string, unknown>[] }) {
  const rows = result.recordset ?? [];
  const failure = rows.some((row) => {
    const flag = row.IsSuccess ?? row.isSuccess ?? row.InSuccess ?? row.inSuccess;
    return flag !== undefined && flag !== null && (flag === false || flag === 0 || flag === "0");
  });
  if (failure) return NextResponse.json(
    { status: 409, error: "عملیات در پایگاه داده انجام نشد.", data: rows },
    { status: 409 }
  );
  return NextResponse.json({ status: 200, data: rows }, { status: 200 });
}

/**
 * Phase 7 baseline IDOR protection for Erja-bound requests.
 * This checks the actor's current (active) account locality against sender/receiver.
 * It is NOT a complete role/state/assignment policy: validate PostId, council,
 * investigator and finalisation rights separately before production approval.
 * A missing case or no locality match is deliberately answered as 403.
 */
export async function assertResearchCaseScope(
  actor: { userId: number; mahal: number }, erjaId: unknown
): Promise<void> {
  const id = positiveId(erjaId);
  if (!id) throw new ResearchAccessError(403, "دسترسی به پرونده مجاز نیست.");
  const pool = await getConnection();
  const result = await pool.request()
    .input("ErjaId", sql.BigInt, id)
    .query(`SELECT TOP (1) MahalSender, MahalReciver
            FROM Tahghighat.Erja
            WHERE ErjaId = @ErjaId AND ISNULL(IsDelete, 0) = 0`);
  const row = result.recordset?.[0];
  if (!row || !positiveId(actor.mahal) ||
      ![row.MahalSender, row.MahalReciver].some(
        (mahal) => positiveId(mahal) && isMahalInScope(actor.mahal, Number(mahal))
      )) {
    throw new ResearchAccessError(403, "دسترسی به پرونده مجاز نیست.");
  }
}


/**
 * Validate that a Tahghigh belongs to at least one active referral visible
 * to the authenticated actor. A valid token by itself is insufficient.
 * This is a locality boundary; role/assignment/state rules remain separate.
 */
export async function assertResearchTahghighScope(
  actor: { userId: number; mahal: number }, tahghighId: unknown
): Promise<void> {
  const id = positiveId(tahghighId);
  if (!id || !positiveId(actor.mahal)) {
    throw new ResearchAccessError(403, "دسترسی به تحقیق مجاز نیست.");
  }
  const pool = await getConnection();
  const result = await pool.request()
    .input("TahghighId", sql.BigInt, id)
    .query(`SELECT DISTINCT E.MahalSender, E.MahalReciver
            FROM Tahghighat.Erja_Tahghigh T
            INNER JOIN Tahghighat.Erja E ON E.ErjaId = T.ErjaId
            WHERE T.TahghighId = @TahghighId
              AND ISNULL(T.IsDelete,0) = 0 AND ISNULL(E.IsDelete,0) = 0`);
  if (!result.recordset?.some((row) =>
      [row.MahalSender, row.MahalReciver].some((mahal) =>
        positiveId(mahal) && isMahalInScope(actor.mahal, Number(mahal))
      ))) {
    throw new ResearchAccessError(403, "دسترسی به تحقیق مجاز نیست.");
  }
}

/** Prevent modifying arbitrary worksheets by guessing KarbargId. */
export async function assertResearchKarbargScope(
  actor: { userId: number; mahal: number }, karbargId: unknown
): Promise<void> {
  const id = positiveId(karbargId);
  if (!id) throw new ResearchAccessError(403, "دسترسی به کاربرگ مجاز نیست.");
  const pool = await getConnection();
  const result = await pool.request()
    .input("KarbargId", sql.BigInt, id)
    .query(`SELECT TOP (1) ErjaId
            FROM Tahghighat.Erja_Tahghigh_Karbarg
            WHERE KarbargId = @KarbargId AND ISNULL(IsDelete,0) = 0`);
  if (!result.recordset?.[0]) {
    throw new ResearchAccessError(403, "دسترسی به کاربرگ مجاز نیست.");
  }
  await assertResearchCaseScope(actor, result.recordset[0].ErjaId);
}
