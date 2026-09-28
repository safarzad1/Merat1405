import { NextRequest, NextResponse } from "next/server";

function getClientIp(req: NextRequest) {
    const xff = req.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();

    const xRealIp = req.headers.get("x-real-ip");
    if (xRealIp) return xRealIp.trim();

    const cfIp = req.headers.get("cf-connecting-ip"); // Cloudflare
    if (cfIp) return cfIp.trim();

    return null;
}

export function GET(req: NextRequest) {
    const ip = getClientIp(req);
    return NextResponse.json({ ip });
}
