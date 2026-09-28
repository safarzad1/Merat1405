import { NextRequest, NextResponse } from "next/server";
import sql from "mssql";

import { getConnection } from "@/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
    const token = req.cookies.get("token")?.value;
    if (!token) {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: No token" },
            { status: 401 }
        );
    }
    const body = await req.json();
    const { hamkariId, personId, noeHamkari, noeGharardad
        , mahalHamkari, sathHamkari, radeTakhasos, sharhTakhasos
        , vaziyatHamkari, userId, isActive
    } = body;

    try {
        verifyToken(token);
    } catch {
        return NextResponse.json(
            { status: 401, error: "Unauthorized: Invalid or expired token" },
            { status: 401 }
        );
    }

    try {
        const pool = await getConnection();
        const result = await pool
            .request()
            .input("HamkariId", sql.BigInt, hamkariId)
            .input("PersonId", sql.BigInt, personId)
            .input("NoeHamkari", sql.Int, noeHamkari)
            .input("NoeGharardad", sql.Int, noeGharardad)
            .input("MahalHamkari", sql.BigInt, mahalHamkari)
            .input("SathHamkari", sql.Int, sathHamkari)
            .input("RadeTakhasos", sql.Int, radeTakhasos)
            .input("SharhTakhasos", sql.Int, sharhTakhasos)
            .input("VaziyatHamkari", sql.Int, vaziyatHamkari)
            .input("UserId", sql.BigInt, userId)
            .input("IsActive", sql.Bit, isActive)
            .execute("Hamkari.SP_InsertHamkari");

        return NextResponse.json(
            { status: 200, data: result.recordset }
        );

    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500 }
        );
    }
}
