async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || Number(data?.status || res.status) >= 400) {
    throw new Error(data?.error || data?.message || "خطا در انجام عملیات");
  }
  return data;
}

async function postJson(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return readJson(res);
}

export const GetAkhbarLookups = (userId) => postJson("/Api/Akhbar/GetLookups", { userId });
export const GetKhabarCounts = (userId) => postJson("/Api/Akhbar/GetCounts", { userId });
export const GetKhabarList = (userId, page, sizePage, sortIndex, sortDirection, search, boxType) =>
  postJson("/Api/Akhbar/GetList", { userId, page, sizePage, sortIndex, sortDirection, search, boxType });
export const GetKhabar = (shomareKhabar, userId) => postJson("/Api/Akhbar/GetById", { shomareKhabar, userId });
export const InsertKhabar = (payload) => postJson("/Api/Akhbar/Insert", payload);
export const UpdateKhabar = (payload) => postJson("/Api/Akhbar/Update", payload);
export const DeleteKhabar = (shomareKhabar, userId) => postJson("/Api/Akhbar/Delete", { shomareKhabar, userId });
export const InsertNoghteKhabarkhiz = (onvan, createUserId) => postJson("/Api/Akhbar/InsertHotspot", { onvan, createUserId });
export const SearchAkhbarAshkhas = (shomareKhabar, userId, search, page, sizePage) =>
  postJson("/Api/Akhbar/SearchPersons", { shomareKhabar, userId, search, page, sizePage });
export const GetKhabarAshkhas = (shomareKhabar, userId) => postJson("/Api/Akhbar/GetPersons", { shomareKhabar, userId });
export const InsertKhabarShakhs = (shomareKhabar, shomarehParvandeh, createUserId) =>
  postJson("/Api/Akhbar/AddPerson", { shomareKhabar, shomarehParvandeh, createUserId });
export const DeleteKhabarShakhs = (khabarShakhsId, userId) => postJson("/Api/Akhbar/DeletePerson", { khabarShakhsId, userId });
export const GetKhabarPeyvastha = (shomareKhabar, userId) => postJson("/Api/Akhbar/GetAttachments", { shomareKhabar, userId });
export const DeleteKhabarPeyvast = (khabarPeyvastId, userId) => postJson("/Api/Akhbar/DeleteAttachment", { khabarPeyvastId, userId });
export const GetNextKhabarDestination = (shomareKhabar, userId) => postJson("/Api/Akhbar/GetNextDestination", { shomareKhabar, userId });
export const SendKhabar = (shomareKhabar, userId, tozihat, expectedToUserId) =>
  postJson("/Api/Akhbar/Send", { shomareKhabar, userId, tozihat, expectedToUserId });
export const ReturnKhabar = (shomareKhabar, userId, tozihat, eshkalatIds) =>
  postJson("/Api/Akhbar/Return", { shomareKhabar, userId, tozihat, eshkalatIds });
export const GetKhabarGardesh = (shomareKhabar, userId) => postJson("/Api/Akhbar/GetWorkflow", { shomareKhabar, userId });

export async function UploadKhabarPeyvast(shomareKhabar, userId, file) {
  const fd = new FormData();
  fd.append("shomareKhabar", String(shomareKhabar));
  fd.append("userId", String(userId));
  fd.append("file", file);
  const res = await fetch("/Api/Akhbar/UploadAttachment", { method: "POST", body: fd, cache: "no-store" });
  return readJson(res);
}

export function GetKhabarPeyvastUrl(shomareKhabar, userId, fileName) {
  const params = new URLSearchParams({
    shomareKhabar: String(shomareKhabar),
    userId: String(userId),
    fileName: String(fileName || ""),
  });
  return `/Api/Akhbar/GetAttachmentFile?${params.toString()}`;
}
