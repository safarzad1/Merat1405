import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/Login";
const DASHBOARD_PATH = "/Dashboard";
const SESSION_COOKIE = "merat-new-session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.toLowerCase();
  const hasToken = Boolean(request.cookies.get("token")?.value);
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === "1";
  const isAuthenticated = hasToken && hasSession;

  if (normalizedPath === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? DASHBOARD_PATH : LOGIN_PATH, request.url)
    );
  }

  if (normalizedPath === "/login") {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL(DASHBOARD_PATH, request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!Api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
