import { NextRequest, NextResponse } from "next/server";

function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === "production";

  for (const name of ["token", "merat-new-session"]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
      expires: new Date(0),
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  return clearAuthCookies(
    NextResponse.redirect(new URL("/Login", request.url), 303)
  );
}

export async function POST() {
  return clearAuthCookies(
    NextResponse.json({ status: 200, message: "OK" }, { status: 200 })
  );
}
