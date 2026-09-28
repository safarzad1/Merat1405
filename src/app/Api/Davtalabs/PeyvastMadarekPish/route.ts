import { NextResponse } from "next/server";
import sql from "mssql";
import { getConnection } from "@/lib/db";

type PeyvastJsonItem = {
    id: number;
    shomarehParvandeh: string;
    type: number;
    title: string;
    mime: string;
    base64: string;
};

function guessMime(_buf: Buffer): string {
    return "image/jpeg";
}

export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => ({}));
        const shomarehParvandeh = String(body?.shomarehParvandeh ?? "").trim();

        if (!shomarehParvandeh) {
            return NextResponse.json(
                { status: 400, message: "شماره پرونده الزامی است" },
                { status: 400 }
            );
        }

        const pool = await getConnection();

        const dbResult = await pool
            .request()
            .input("ShomarehParvandeh", sql.BigInt, shomarehParvandeh)
            .execute("[Davtalab].SP_PeyvastMadarek");

        const rows: any[] = dbResult?.recordset ?? [];

        if (!rows.length) {
            return NextResponse.json([] satisfies PeyvastJsonItem[], {
                headers: { "Cache-Control": "no-store" },
            });
        }

        const list: PeyvastJsonItem[] = [];

        for (const r of rows) {
            const buffer = r?.Files;

            if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 50) continue;

            const id = Number(r?.ID ?? r?.Id ?? r?.id ?? 0);
            const type = Number(r?.Type ?? r?.type ?? 0);
            const title = String(r?.Title ?? r?.title ?? r?.Name ?? r?.name ?? "").trim();

            const mime = String(r?.Mime ?? r?.mime ?? "").trim() || guessMime(buffer);
            const base64 = buffer.toString("base64");

            list.push({
                id: id || list.length + 1,
                shomarehParvandeh,
                type,
                title: title || `پیوست ${type || list.length}`,
                mime,
                base64,
            });
        }

        if (!list.length) {
            return NextResponse.json([] satisfies PeyvastJsonItem[], {
                headers: { "Cache-Control": "no-store" },
            });
        }

        return NextResponse.json(list, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (err) {
        return NextResponse.json(
            {
                status: 500,
                message: err instanceof Error ? err.message : "خطای ناشناخته در سرور",
            },
            { status: 500 }
        );
    }
}
