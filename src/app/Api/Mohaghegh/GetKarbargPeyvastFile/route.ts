import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import sql from "mssql";
import { getConnection } from "@/lib/db";
import { positiveId, requireResearchIdentity, assertResearchCaseScope, researchAccessResponse } from "@/lib/researchSecurity";

export const runtime = "nodejs";
const mimeTypes: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".bmp": "image/bmp",
  ".pdf": "application/pdf",
};

// Serve only files actually attached to this karbarg and visible to the actor.
// This avoids relying on Next's static public file serving after deployment.
export async function GET(req: NextRequest) {
  try {
    const actor = await requireResearchIdentity(req.cookies.get("token")?.value);
    const karbargId = positiveId(req.nextUrl.searchParams.get("karbargid"));
    const originalName = req.nextUrl.searchParams.get("filename") || "";
    if (!karbargId || !originalName || originalName.length > 500 || originalName.includes("\0")) {
      return NextResponse.json({ error: "درخواست فایل نامعتبر است." }, { status: 400 });
    }
    const pool = await getConnection();
    const result = await pool.request()
      .input("KarbargId", sql.BigInt, karbargId)
      .input("FileName", sql.NVarChar(500), originalName)
      .query(`SELECT TOP (1) K.ErjaId
              FROM Tahghighat.Erja_Tahghigh_Karbarg_Peyvast P
              INNER JOIN Tahghighat.Erja_Tahghigh_Karbarg K ON K.KarbargId = P.KarbargId
              WHERE P.KarbargId = @KarbargId AND P.FileName = @FileName
                AND ISNULL(P.IsDelete,0) = 0 AND ISNULL(K.IsDelete,0) = 0`);
    const erjaId = result.recordset?.[0]?.ErjaId;
    if (!erjaId) return NextResponse.json({ error: "پیوست یافت نشد." }, { status: 404 });
    await assertResearchCaseScope(actor, erjaId);

    const safeName = originalName.replace(/\\/g, "/").split("/").pop() || "";
    if (!/^[a-zA-Z0-9_.-]+$/.test(safeName) || safeName === "." || safeName === "..") {
      return NextResponse.json({ error: "نام فایل نامعتبر است." }, { status: 400 });
    }
    const filePath = path.join(process.cwd(), "public", "uploads", safeName);
    let content: Buffer;
    try { content = await fs.readFile(filePath); }
    catch (error: any) {
      if (error?.code === "ENOENT") return NextResponse.json({ error: "فایل روی سرور موجود نیست." }, { status: 404 });
      throw error;
    }
    const bytes = new Uint8Array(new ArrayBuffer(content.byteLength));
    bytes.set(content);
    return new NextResponse(bytes.buffer, {
      status: 200,
      headers: {
        "Content-Type": mimeTypes[path.extname(safeName).toLowerCase()] || "application/octet-stream",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return researchAccessResponse(error);
  }
}
