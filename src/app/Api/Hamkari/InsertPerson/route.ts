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
    const { personId, codeMelli, firstName, lastName, fatherName, tarikhTavalod, shomareShenasnameh, serialShenasnameh, mahalTavalod, mahalSodor, telHamrah,phoneNumber, jensiyat, taahol, din, mazhab, mahal, createUserId
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
            .input("PersonId", sql.BigInt, personId)
            .input("CodeMelli", sql.NVarChar(200), codeMelli)
            .input("FirstName", sql.NVarChar(200), firstName)
            .input("LastName", sql.NVarChar(200), lastName)
            .input("FatherName", sql.NVarChar(200), fatherName)
            .input("TarikhTavalod", sql.NVarChar(200), tarikhTavalod)
            .input("ShomareShenasnameh", sql.NVarChar(200), shomareShenasnameh)
            .input("SerialShenasnameh", sql.NVarChar(200), serialShenasnameh)
            .input("MahalTavalod", sql.NVarChar(200), mahalTavalod)
            .input("MahalSodor", sql.NVarChar(200), mahalSodor)
            .input("TelHamrah", sql.NVarChar(200), telHamrah)
            .input("PhoneNumber", sql.NVarChar(200), phoneNumber)
            .input("Jensiyat", sql.Int, jensiyat)
            .input("Taahol", sql.Int, taahol)
            .input("Din", sql.Int, din)
            .input("Mazhab", sql.BigInt, mazhab)
            .input("Mahal", sql.Int, mahal)
            .input("CreateUserId", sql.Int, createUserId)
            .execute("Hamkari.SP_InsertPerson");

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
