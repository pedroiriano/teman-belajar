import { NextRequest, NextResponse } from "next/server";

import { expireNextAuthCookies } from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  const response = new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
  const expectedIssuer = process.env.KEYCLOAK_ISSUER;
  const issuer = request.nextUrl.searchParams.get("iss");
  const sessionId = request.nextUrl.searchParams.get("sid");
  if (!expectedIssuer || issuer !== expectedIssuer || !sessionId) return response;

  // The browser cookie selects the local session. Validate the exact governed
  // issuer and require Keycloak's sid, then clear all cookie chunks; decoding a
  // second sid here can strand a rotated-but-valid local session.
  return expireNextAuthCookies(request, response);
}
