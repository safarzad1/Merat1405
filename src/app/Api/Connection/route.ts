import { NextResponse } from "next/server";

export async function GET() {
    const dbConfig = {
        server: process.env.DB_SERVER,
        database: process.env.DB_DATABASE,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD
    };

    return NextResponse.json(dbConfig);
}
