import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess } from "@/lib/adminAccess";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  try {
    const { isAdmin } = await getAdminAccess(req.cookies.get("token")?.value);
    return NextResponse.json({ isAdmin }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const status = error instanceof Error && error.message === "UNAUTHORIZED" ? 401 : 500;
    return NextResponse.json({ isAdmin: false }, { status, headers: { "Cache-Control": "no-store" } });
  }
}
