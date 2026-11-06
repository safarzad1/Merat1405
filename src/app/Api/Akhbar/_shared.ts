import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getAuthActor } from "@/lib/userScope";

export function authorize(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized: No token" }, { status: 401 });
  try {
    verifyToken(token);
    return null;
  } catch {
    return NextResponse.json({ status: 401, error: "Unauthorized: Invalid or expired token" }, { status: 401 });
  }
}

/** Checks the signed identity against the active database row.
 * Revoking an account takes effect immediately, even with an unexpired cookie.
 */
export async function assertSessionUser(req: NextRequest, userId: number) {
  const actor = await getAuthActor(req.cookies.get("token")?.value);
  if (actor.userId !== userId) throw new Error("FORBIDDEN");
}

export class NewsInputError extends Error {
  constructor(message: string) { super(message); this.name = "NewsInputError"; }
}

export function errorResponse(err: unknown) {
  const message = typeof (err as { message?: unknown } | null)?.message === "string"
    ? (err as { message: string }).message : "";
  const headers = { "Cache-Control": "private, no-store" };
  if (message === "UNAUTHORIZED" || message === "FORBIDDEN") {
    const status = message === "UNAUTHORIZED" ? 401 : 403;
    return NextResponse.json({ status, error: status === 401 ? "نشست معتبر نیست." : "دسترسی غیرمجاز است." }, { status, headers });
  }
  if (err instanceof NewsInputError || err instanceof SyntaxError ||
      (err instanceof Error && err.name === "NewsInputError")) {
    return NextResponse.json({ status: 400, error: err instanceof SyntaxError ? "ساختار درخواست نامعتبر است." : message }, { status: 400, headers });
  }
  const dbError = err as { number?: number; originalError?: { info?: { number?: number; message?: string } }; message?: string };
  const code = Number(dbError?.number ?? dbError?.originalError?.info?.number ?? 0);
  if (code >= 51000 && code <= 52999) {
    // Business-rule errors deliberately emitted with THROW by news procedures.
    return NextResponse.json({ status: 409, error: dbError?.originalError?.info?.message || message || "اقدام مجاز نیست." }, { status: 409, headers });
  }
  // Do not disclose SQL syntax, schema, connection details or a stack trace to callers.
  console.error("News API unexpected failure", err);
  return NextResponse.json({ status: 500, error: "خطایی در پردازش درخواست اخبار رخ داد." }, { status: 500, headers });
}

export function positiveNumber(value: unknown, name: string) {
  const text = typeof value === "string" ? value.trim() : "";
  const n = typeof value === "number" ? value : typeof value === "string" && /^[0-9]+$/.test(text) ? Number(text) : NaN;
  if (!Number.isSafeInteger(n) || n <= 0) throw new NewsInputError(`${name} نامعتبر است.`);
  return n;
}
