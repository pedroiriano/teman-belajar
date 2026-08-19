import { getToken } from "next-auth/jwt";
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

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (typeof token?.oidcSid !== "string" || token.oidcSid !== sessionId) return response;
  return expireNextAuthCookies(request, response);
}
