/** API boundary validation for the existing news input contract.
 * No database objects or business workflow permissions are changed here.
 */
export class NewsFormValidationError extends Error {
  constructor(message: string) { super(message); this.name = "NewsInputError"; }
}

function plainText(value: unknown, name: string, limit: number, required = false) {
  if (value != null && typeof value !== "string") throw new NewsFormValidationError(`${name} نامعتبر است.`);
  const text = String(value ?? "").trim();
  if (text.length > limit) throw new NewsFormValidationError(`${name} بیش از حد مجاز است (حداکثر ${limit} نویسه).`);
  if (required && !text) throw new NewsFormValidationError(`${name} الزامی است.`);
  return text || null;
}

function exactPositiveInteger(value: unknown, name: string, nullable = false) {
  if (nullable && (value === null || value === undefined || value === "" || value === 0)) return null;
  const raw = typeof value === "string" ? value.trim() : value;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(n) || n <= 0) throw new NewsFormValidationError(`${name} نامعتبر است.`);
  return n;
}

function sqlInt(value: unknown, name: string) {
  const num = exactPositiveInteger(value, name);
  if (num === null || num > 2147483647) throw new NewsFormValidationError(`${name} نامعتبر است.`);
  return num;
}

function textBody(value: unknown, name: string) {
  if (value != null && typeof value !== "string") throw new NewsFormValidationError(`${name} نامعتبر است.`);
  return String(value ?? "");
}

function tinyInt(value: unknown, name: string) {
  const num = exactPositiveInteger(value || 1, name);
  if (num === null || num > 255) throw new NewsFormValidationError(`${name} نامعتبر است.`);
  return num;
}

/** Today's date in the news workflow's timezone (Iran), not the server/browser locale. */
export function todayJalaliIran(): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const value = (part: string) => parts.find(p => p.type === part)?.value || "";
  return `${value("year").padStart(4, "0")}/${value("month").padStart(2, "0")}/${value("day").padStart(2, "0")}`;
}

/** Only checks the upper bound; the normal validator checks format and month lengths. */
export function isFutureNewsDate(value: string): boolean {
  return /^\d{4}\/\d{2}\/\d{2}$/.test(value) && value > todayJalaliIran();
}

export function jalaliDateOrNull(value: unknown, name: string) {
  const v = plainText(value, name, 10);
  if (!v) return null;
  const match = /^((?:13|14)\d{2})\/(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])$/.exec(v);
  if (!match) throw new NewsFormValidationError(`${name} باید تاریخ شمسی معتبر با قالب YYYY/MM/DD باشد.`);
  const month = Number(match[2]); const day = Number(match[3]);
  // Esfand 30 is valid in leap years; the existing DB date converter makes the final leap-year check.
  if ((month > 6 && day > 30) || (month === 12 && day > 30))
    throw new NewsFormValidationError(`${name} نامعتبر است.`);
  if (isFutureNewsDate(v)) throw new NewsFormValidationError(`${name} نمی‌تواند بعد از تاریخ امروز باشد.`);
  return v;
}

export function validateNewsForm(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new NewsFormValidationError("اطلاعات خبر نامعتبر است.");
  const b = raw as Record<string,unknown>;
  return {
    tabaqehBandi: tinyInt(b.tabaqehBandi, "طبقه‌بندی"),
    manbaKhabarId: sqlInt(b.manbaKhabarId, "منبع خبر"),
    noeKhabar: tinyInt(b.noeKhabar, "نوع خبر"),
    tarikhNameh: jalaliDateOrNull(b.tarikhNameh, "تاریخ نامه"),
    shomareNameh: plainText(b.shomareNameh, "شماره نامه", 100),
    onvanKhabar: plainText(b.onvanKhabar, "عنوان خبر", 500, true),
    sharhKhabar: textBody(b.sharhKhabar, "شرح خبر"),
    molahazatKhabar: textBody(b.molahazatKhabar, "ملاحظات خبر"),
    noghteKhabarkhizId: exactPositiveInteger(b.noghteKhabarkhizId, "نقطه خبرخیز", true),
    mahalNoghteKhabarkhiz: plainText(b.mahalNoghteKhabarkhiz, "محل نقطه خبرخیز", 500),
    tarikhEnteshar: jalaliDateOrNull(b.tarikhEnteshar, "تاریخ انتشار"),
  };
}

export function validatePersonSearch(raw: unknown) {
  if (!raw || typeof raw !== "object") throw new NewsFormValidationError("درخواست جست‌وجو نامعتبر است.");
  const b = raw as Record<string,unknown>;
  if (b.search != null && typeof b.search !== "string") throw new NewsFormValidationError("متن جست‌وجو نامعتبر است.");
  const search = String(b.search ?? "").trim();
  if (search.length > 150) throw new NewsFormValidationError("متن جست‌وجو حداکثر ۱۵۰ نویسه است.");
  const page = exactPositiveInteger(b.page ?? 1, "شماره صفحه");
  const sizePage = exactPositiveInteger(b.sizePage ?? 10, "تعداد سطر صفحه");
  if (!page || page > 100000 || !sizePage || sizePage > 50)
    throw new NewsFormValidationError("صفحه‌بندی جست‌وجوی اشخاص نامعتبر است.");
  return { search, page, sizePage };
}

export function validateExpectedRecipient(value: unknown) {
  return exactPositiveInteger(value, "گیرنده مورد انتظار", true);
}
