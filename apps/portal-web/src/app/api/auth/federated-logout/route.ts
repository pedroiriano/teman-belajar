import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { expireNextAuthCookies } from "@/lib/auth-cookies";
import { createMoodleLogoutBridgeUrl, createWebLogoutBridgeUrl } from "@/lib/logout-bridge";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (token && req.nextUrl.searchParams.get("bridge") !== "1") {
      const publicBaseUrl = process.env.NEXTAUTH_URL;
      const adminBaseUrl = process.env.ADMIN_PUBLIC_BASE_URL;
      if (!publicBaseUrl || !adminBaseUrl) throw new Error("Federated logout public URLs are required.");
      const returnUrl = new URL("/api/auth/federated-logout", publicBaseUrl);
      returnUrl.searchParams.set("bridge", "1");
      const moodleBridgeUrl = createMoodleLogoutBridgeUrl(returnUrl);
      return NextResponse.redirect(createWebLogoutBridgeUrl(adminBaseUrl, moodleBridgeUrl));
    }
    
    const issuer = process.env.KEYCLOAK_ISSUER || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar";
    const baseUrl = process.env.POST_LOGOUT_REDIRECT_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
    // Ensure the redirect URI matches the Keycloak wildcard pattern (e.g. http://localhost:3000/*)
    const postLogoutUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    const logoutUrl = new URL(`${issuer}/protocol/openid-connect/logout`);
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutUrl);
    if (token && typeof token.idToken === "string") {
      logoutUrl.searchParams.set("id_token_hint", token.idToken);
    } else {
      logoutUrl.searchParams.set("client_id", process.env.KEYCLOAK_ID || "teman-belajar-web");
    }
    return expireNextAuthCookies(req, NextResponse.redirect(logoutUrl));
  } catch {
    return expireNextAuthCookies(
      req,
      NextResponse.redirect(process.env.POST_LOGOUT_REDIRECT_URL || process.env.NEXTAUTH_URL || "http://localhost:3000"),
    );
  }
}
