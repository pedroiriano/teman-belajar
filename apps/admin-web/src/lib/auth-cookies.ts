import type { NextRequest, NextResponse } from "next/server";

export const ADMIN_SESSION_COOKIE_NAME = "admin-next-auth.session-token";

const sessionCookiePrefixes = ["next-auth.", "admin-next-auth.", "__Secure-next-auth.", "__Host-next-auth."];

export function expireNextAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (!sessionCookiePrefixes.some((prefix) => cookie.name.startsWith(prefix))) continue;
    response.cookies.set({
      name: cookie.name,
      value: "",
      path: "/",
      expires: new Date(0),
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      // Session cookies are explicitly Secure, including on governed localhost.
      // Match that attribute when expiring every chunk so stale suffixes cannot
      // accumulate across repeated federated-login cycles.
      secure: true,
    });
  }
  return response;
}

