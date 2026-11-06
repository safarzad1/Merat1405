export type V2Row = Record<string, unknown>;
export type V2ApiResponse = { ok: boolean; data?: V2Row[]; message?: string };

export async function meratV2Request(url: string, body?: Record<string, unknown>): Promise<V2Row[]> {
  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin", cache: "no-store"
  });
  let data: V2ApiResponse;
  try { data = await response.json() as V2ApiResponse; }
  catch { throw new Error("پاسخ سرور معتبر نیست."); }
  if (!response.ok || !data.ok) throw new Error(data.message || "درخواست انجام نشد.");
  return data.data || [];
}
