import { NextResponse } from "next/server";
import { getConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const requiredEnv = ["DB_SERVER", "DB_USER", "DB_PASSWORD", "DB_DATABASE", "JWT_SECRET"] as const;
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);

  if (missingEnv.length > 0) {
    return NextResponse.json(
      {
        status: 503,
        app: "ok",
        database: "not_checked",
        missingEnv,
      },
      { status: 503 },
    );
  }

  try {
    const pool = await getConnection();
    await pool.request().query("SELECT 1 AS Ok");

    return NextResponse.json({
      status: 200,
      app: "ok",
      database: "ok",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 503,
        app: "ok",
        database: "error",
        message: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 503 },
    );
  }
}
