import type { NextRequest, NextResponse } from "next/server";

const sessionCookiePrefixes = ["next-auth.", "__Secure-next-auth.", "__Host-next-auth."];

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
      secure: cookie.name.startsWith("__Secure-") || cookie.name.startsWith("__Host-"),
    });
  }
  return response;
}
