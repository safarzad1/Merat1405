import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUserId } from "./authBridge";
import { getMeratPool, sql } from "./db";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

export function requiredInt(value: unknown, name: string): number {
  const num = typeof value === "number" ? value :
    (typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN);
  if (!Number.isSafeInteger(num) || num <= 0)
    throw new ApiError(400, "INVALID_INPUT", `${name} نامعتبر است.`);
  return num;
}

export function requiredText(value: unknown, name: string, max = 6000): string {
  if (typeof value !== "string") throw new ApiError(400, "INVALID_INPUT", `${name} الزامی است.`);
  const result = value.trim();
  if (!result || result.length > max)
    throw new ApiError(400, "INVALID_INPUT", `${name} باید بین ۱ تا ${max} نویسه باشد.`);
  return result;
}

export function action(value: unknown, allowed: readonly string[]): string {
  if (typeof value !== "string" || !allowed.includes(value))
    throw new ApiError(400, "INVALID_ACTION", "اقدام انتخاب‌شده مجاز نیست.");
  return value;
}

export async function jsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  if (!(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json"))
    throw new ApiError(415, "CONTENT_TYPE", "نوع درخواست باید JSON باشد.");
  // Content-Length is optional and cannot be trusted as the sole size limit.
  const declared = Number(req.headers.get("content-length") || 0);
  if (declared > 50000) throw new ApiError(413, "TOO_LARGE", "حجم درخواست زیاد است.");
  let raw: string;
  try { raw = await req.text(); }
  catch { throw new ApiError(400, "INVALID_JSON", "بدنه درخواست خوانده نشد."); }
  if (Buffer.byteLength(raw, "utf8") > 50000)
    throw new ApiError(413, "TOO_LARGE", "حجم درخواست زیاد است.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; }
  catch { throw new ApiError(400, "INVALID_JSON", "بدنه درخواست نامعتبر است."); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new ApiError(400, "INVALID_JSON", "بدنه درخواست باید یک شیء باشد.");
  return parsed as Record<string, unknown>;
}

export function requireSameOrigin(req: NextRequest): void {
  // CSRF guard for cookie-authenticated V2 mutations.
  // Firefox and some browser/proxy combinations omit Origin on same-origin POST.
  // Sec-Fetch-Site is browser-controlled and safely identifies same-origin
  // requests even when a reverse proxy rewrites NextRequest.url and Host.
  const fetchSite = (req.headers.get("sec-fetch-site") || "").trim().toLowerCase();
  const rawOrigin = req.headers.get("origin")?.trim() || null;
  const reject = (message = "مبدأ درخواست معتبر نیست."): never => {
    throw new ApiError(403, "ORIGIN", message);
  };

  const parseOrigin = (value: string): string | null => {
    try {
      const candidate = new URL(value);
      if (!["http:", "https:"].includes(candidate.protocol)) return null;
      return candidate.origin;
    } catch {
      return null;
    }
  };

  // Reject opaque origins explicitly, including when Fetch Metadata is present.
  if (rawOrigin === "null") reject();
  const origin = rawOrigin ? parseOrigin(rawOrigin) : null;
  if (rawOrigin && (!origin || origin !== rawOrigin)) reject();

  // Never treat same-site subdomains as same-origin. A malicious webpage on
  // another subdomain could otherwise initiate cookie-authenticated requests.
  if (fetchSite && fetchSite !== "same-origin")
    reject("درخواست باید از همان نشانی سامانه ارسال شود.");

  // Preferred path for modern browsers, including Firefox on a reverse proxy.
  // Do NOT require Origin here: it is not guaranteed on every same-origin POST.
  if (fetchSite === "same-origin") return;

  // Older browsers: require a canonical Origin or HTTPS/HTTP Referer and
  // compare with the deployment's explicit public origin or direct request.
  // Never trust X-Forwarded-Host as a stand-alone authority.
  const referer = req.headers.get("referer");
  const refererOrigin = referer ? parseOrigin(referer) : null;
  if (referer && !refererOrigin) reject();
  if (origin && refererOrigin && origin !== refererOrigin) reject();

  const sourceOrigin = origin || refererOrigin;
  if (!sourceOrigin) {
    // An explicit throw is required for TypeScript to narrow string | null.
    throw new ApiError(403, "ORIGIN", "مبدأ درخواست معتبر نیست.");
  }

  const trusted = [
    process.env.MERAT_V2_PUBLIC_ORIGIN,
    process.env.NEXT_PUBLIC_SERVER_URL,
  ].flatMap((value) => {
    const parsed = typeof value === "string" ? parseOrigin(value.trim()) : null;
    return parsed ? [parsed] : [];
  });

  if (trusted.includes(sourceOrigin)) return;

  // Direct (non-proxied) deployments: the browser-facing request Host must
  // match Next.js's URL host before comparing the origin.
  try {
    const requestUrl = new URL(req.url);
    const host = req.headers.get("host");
    if (host && host === requestUrl.host && sourceOrigin === requestUrl.origin)
      return;
  } catch {
    // Reject below.
  }
  reject("نشانی عمومی سامانه مطابقت ندارد؛ MERAT_V2_PUBLIC_ORIGIN را بررسی کنید.");
}

export async function authenticatedUserId(): Promise<number> {
  let userId: number;
  try {
    userId = await getAuthenticatedUserId();
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED")
      throw new ApiError(401, "AUTH_REQUIRED", "نشست معتبر نیست؛ دوباره وارد سامانه شوید.");
    throw error;
  }
  if (!Number.isSafeInteger(userId) || userId <= 0)
    throw new ApiError(401, "AUTH_REQUIRED", "ابتدا وارد سامانه شوید.");
  return userId;
}

export async function execute(
  procedure: string,
  bindings: (request: sql.Request) => void,
): Promise<Record<string, unknown>[]> {
  // Procedures must be hardcoded by the route, never taken from a request.
  const pool = await getMeratPool();
  const request = pool.request();
  bindings(request);
  const result = await request.execute(procedure);
  return (result.recordset ?? []) as Record<string, unknown>[];
}

/** Every mutation must return an explicit success signal from its stored procedure. */
export async function executeMutation(
  procedure: string,
  bindings: (request: sql.Request) => void,
): Promise<Record<string, unknown>[]> {
  const rows = await execute(procedure, bindings);
  if (rows.length !== 1 || rows[0]?.IsSuccess !== true && rows[0]?.IsSuccess !== 1)
    throw new ApiError(409, "DB_SAVE_UNCONFIRMED", "ثبت عملیات توسط پایگاه داده تأیید نشد.");
  return rows;
}

export function respond(rows: Record<string, unknown>[]) {
  return NextResponse.json({ ok: true, data: rows }, { headers: { "Cache-Control": "no-store" } });
}

export function fail(error: unknown) {
  if (error instanceof ApiError)
    return NextResponse.json({ ok: false, code: error.code, message: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  // Database business validations from the Merat V2 procedures span 52xxx–55xxx.
  // These are safe, intentional THROW messages, not infrastructure diagnostics.
  const dbError = error as {
    number?: unknown;
    originalError?: { info?: { number?: number; message?: string } };
    message?: unknown;
  };
  const number = typeof dbError?.number === "number"
    ? dbError.number : dbError?.originalError?.info?.number;
  if (typeof number === "number" && number >= 52000 && number < 57000) {
    const message = typeof dbError.message === "string"
      ? dbError.message : (dbError.originalError?.info?.message || "عملیات مجاز نیست.");
    return NextResponse.json({ ok: false, code: `SQL_${number}`, message },
      { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  // Present known deployment/schema failures as actionable, non-sensitive errors.
  // Never echo raw SQL details or stack traces to the browser.
  if (number === 2812) {
    console.error("TahghighV2 missing SQL procedure", error);
    return NextResponse.json({ ok: false, code: "DB_PROCEDURE_MISSING", message: "پروسیجر موردنیاز در دیتابیس برنامه نصب نشده است. فایل SQL اصلاحی نسخه فعلی را روی دیتابیس متصل به سامانه اجرا کنید." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  if (number === 2628 || number === 8152) {
    console.error("TahghighV2 SQL column overflow", error);
    return NextResponse.json({ ok: false, code: "DB_COLUMN_LENGTH", message: "طول یکی از فیلدهای پایگاه داده با اطلاعات ذخیره‌شده سازگار نیست؛ ساختار ستون‌های ثبت رویداد را بررسی کنید." },
      { status: 409, headers: { "Cache-Control": "no-store" } });
  }
  if (number === 207 || number === 208 || number === 201 || number === 8144) {
    console.error("TahghighV2 SQL schema mismatch", error);
    return NextResponse.json({ ok: false, code: "DB_SCHEMA_MISMATCH", message: "ساختار پروسیجر یا جدول پایگاه داده با نسخه سورس هماهنگ نیست. SQL اصلاحی را اعمال کنید." },
      { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  console.error("TahghighV2 API error", error);
  return NextResponse.json({ ok: false, code: "SERVER_ERROR", message: "خطای داخلی سرور؛ عملیات انجام نشد." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
