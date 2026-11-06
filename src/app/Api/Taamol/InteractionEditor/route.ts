import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

const intVal = (value: unknown, allowZero = false) => {
  const num = Number(value);
  return Number.isSafeInteger(num) && (allowZero ? num >= 0 : num > 0) ? num : null;
};
const strVal = (value: unknown, max: number) => {
  const text = String(value ?? "").trim();
  if (text.length > max) throw new Error(`طول داده بیش از حد مجاز است.`);
  return text || null;
};
const ok = (data: unknown) => NextResponse.json({ status: 200, data });
const fail = (error: string, status = 400) => NextResponse.json({ status, error }, { status });

export async function POST(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return fail("Unauthorized", 401);
  try {
    verifyToken(token);
    const body = await req.json();
    const action = String(body.action || "").trim();
    const pool = await getConnection();

    if (action === "bootstrap") {
      const result = await pool.request().execute("Taamol.SP_GetInteractionEditorBootstrap");
      const sets = result.recordsets as sql.IRecordSet<any>[];
      return ok({
        groups: sets[0] || [],
        organizations: sets[1] || [],
        locations: sets[2] || [],
        roles: sets[3] || [],
        representatives: sets[4] || [],
        currentInteraction: null,
        people: [],
        representativesList: [],
      });
    }

    if (action === "list") {
      const page = Math.max(1, Math.min(100000, intVal(body.page) || 1));
      const size = Math.max(1, Math.min(50, intVal(body.sizePage) || 15));
      const result = await pool.request()
        .input("Search", sql.NVarChar(150), strVal(body.search, 150))
        .input("Page", sql.Int, page)
        .input("SizePage", sql.Int, size)
        .execute("Taamol.SP_ListInteractions");
      const sets = result.recordsets as sql.IRecordSet<any>[];
      return ok({ rows: sets?.[0] || [], total: Number(sets?.[1]?.[0]?.Total || 0) });
    }
    if (action === "get") {
      const id = intVal(body.interactionId);
      if (!id) return fail("شناسه تعامل نامعتبر است.");
      const result = await pool.request().input("InteractionId", sql.BigInt, id).execute("Taamol.SP_GetInteractionDetail");
      const sets = result.recordsets as sql.IRecordSet<any>[];
      if (!sets?.[0]?.length) return fail("تعامل یافت نشد.", 404);
      return ok({ interaction: sets[0][0], people: sets?.[1] || [], representatives: sets?.[2] || [] });
    }

    if (action === "saveInteraction") {
      const interaction = body.interaction || {};
      const userId = intVal(body.userId);
      if (!userId) return fail("شناسه کاربر نامعتبر است.");
      const request = pool.request()
        .input("InteractionId", sql.BigInt, intVal(interaction.InteractionId, true) || 0)
        .input("MeetingDate", sql.NVarChar(10), strVal(interaction.MeetingDate, 10))
        .input("FromTime", sql.NVarChar(5), strVal(interaction.FromTime, 5))
        .input("ToTime", sql.NVarChar(5), strVal(interaction.ToTime, 5))
        .input("OrganizationGroupId", sql.Int, intVal(interaction.OrganizationGroupId))
        .input("OrganizationId", sql.Int, intVal(interaction.OrganizationId))
        .input("LocationId", sql.Int, intVal(interaction.LocationId) || null)
        .input("LocationDescription", sql.NVarChar(500), strVal(interaction.LocationDescription, 500))
        .input("SummaryText", sql.NVarChar(sql.MAX), strVal(interaction.SummaryText, 4000))
        .input("ResultText", sql.NVarChar(sql.MAX), strVal(interaction.ResultText, 4000))
        .input("UserId", sql.BigInt, userId);
      const saved = await request.execute("Taamol.SP_SaveInteraction");
      return ok(saved.recordset?.[0] || {});
    }

    if (action === "savePerson") {
      const userId = intVal(body.userId);
      const interactionId = intVal(body.interactionId);
      if (!userId || !interactionId) return fail("اطلاعات پایه تعامل نامعتبر است.");
      const item = body.item || {};
      const saved = await pool.request()
        .input("InteractionId", sql.BigInt, interactionId)
        .input("ItemId", sql.BigInt, intVal(item.ItemId, true) || 0)
        .input("FullName", sql.NVarChar(150), strVal(item.FullName, 150))
        .input("RankTitle", sql.NVarChar(150), strVal(item.RankTitle, 150))
        .input("PositionTitle", sql.NVarChar(150), strVal(item.PositionTitle, 150))
        .input("Notes", sql.NVarChar(1000), strVal(item.Notes, 1000))
        .input("UserId", sql.BigInt, userId)
        .execute("Taamol.SP_SaveInteractionPerson");
      return ok(saved.recordset?.[0] || {});
    }

    if (action === "deletePerson") {
      const userId = intVal(body.userId); const itemId = intVal(body.itemId);
      if (!userId || !itemId) return fail("شناسه رکورد نامعتبر است.");
      const deleted = await pool.request().input("ItemId", sql.BigInt, itemId).input("UserId", sql.BigInt, userId).execute("Taamol.SP_DeleteInteractionPerson");
      return ok(deleted.recordset?.[0] || {});
    }

    if (action === "saveRepresentative") {
      const userId = intVal(body.userId);
      const interactionId = intVal(body.interactionId);
      if (!userId || !interactionId) return fail("اطلاعات پایه تعامل نامعتبر است.");
      const item = body.item || {};
      const saved = await pool.request()
        .input("InteractionId", sql.BigInt, interactionId)
        .input("ItemId", sql.BigInt, intVal(item.ItemId, true) || 0)
        .input("RoleId", sql.Int, intVal(item.RoleId))
        .input("RepresentativeId", sql.Int, intVal(item.RepresentativeId))
        .input("Notes", sql.NVarChar(1000), strVal(item.Notes, 1000))
        .input("UserId", sql.BigInt, userId)
        .execute("Taamol.SP_SaveInteractionRepresentative");
      return ok(saved.recordset?.[0] || {});
    }

    if (action === "deleteRepresentative") {
      const userId = intVal(body.userId); const itemId = intVal(body.itemId);
      if (!userId || !itemId) return fail("شناسه رکورد نامعتبر است.");
      const deleted = await pool.request().input("ItemId", sql.BigInt, itemId).input("UserId", sql.BigInt, userId).execute("Taamol.SP_DeleteInteractionRepresentative");
      return ok(deleted.recordset?.[0] || {});
    }

    return fail("عملیات نامعتبر است.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "خطای سرور", 500);
  }
}
