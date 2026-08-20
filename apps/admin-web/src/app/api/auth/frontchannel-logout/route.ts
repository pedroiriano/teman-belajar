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

  // OIDC Front-Channel Logout is an issuer-bound browser notification. The
  // current HttpOnly cookie already identifies the local browser session;
  // requiring a second sid decoded from that cookie made logout brittle after
  // token rotation and left valid Admin sessions alive. Match the governed
  // issuer exactly and require Keycloak's non-empty sid, consistent with the
  // Moodle receiver, then expire every local NextAuth cookie chunk.
  return expireNextAuthCookies(request, response);
}
