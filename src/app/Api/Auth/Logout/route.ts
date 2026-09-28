import { NextRequest, NextResponse } from "next/server";

function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";

  response.cookies.set("token", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set("merat-new-session", "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}

export async function POST() {
  return clearAuthCookies(
    NextResponse.json({ status: 200, message: "OK" }, { status: 200 })
  );
}

export async function GET(request: NextRequest) {
  const target = new URL("/Login", request.url);
  return clearAuthCookies(NextResponse.redirect(target));
}
