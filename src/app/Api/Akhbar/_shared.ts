import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export function authorize(req: NextRequest) {
  const token = req.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ status: 401, error: "Unauthorized: No token" }, { status: 401 });
  try {
    verifyToken(token);
    return null;
  } catch {
    return NextResponse.json({ status: 401, error: "Unauthorized: Invalid or expired token" }, { status: 401 });
  }
}

export function errorResponse(err: unknown) {
  return NextResponse.json(
    { status: 500, error: err instanceof Error ? err.message : "Unknown error" },
    { status: 500 },
  );
}

export function positiveNumber(value: unknown, name: string) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`${name} نامعتبر است.`);
  return n;
}
