import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/Login";
const DASHBOARD_PATH = "/Dashboard";
const LOGOUT_PATH = "/Logout";
const SESSION_COOKIE = "merat-new-session";

/**
 * Fast middleware-side check only.
 * The JWT signature is still verified by server-side pages/API routes.
 * Here we reject malformed/expired tokens early so an old localhost cookie
 * cannot keep bouncing /Login -> /Dashboard.
 */
function hasUsableToken(token?: string): boolean {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as { exp?: number };

    if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.toLowerCase();

  // Logout must always be reachable, including for an expired/corrupt session.
  if (normalizedPath === LOGOUT_PATH.toLowerCase()) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === "1";
  const isAuthenticated = hasSession && hasUsableToken(token);

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
