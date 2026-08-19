import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { expireNextAuthCookies } from "@/lib/auth-cookies";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    const issuer = process.env.KEYCLOAK_ISSUER || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar";
    const postLogoutUrl = process.env.POST_LOGOUT_REDIRECT_URL || process.env.NEXTAUTH_URL || "http://localhost:3001";
    const logoutUrl = new URL(`${issuer}/protocol/openid-connect/logout`);
    logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutUrl);
    if (token && typeof token.idToken === "string") {
      logoutUrl.searchParams.set("id_token_hint", token.idToken);
    } else {
      logoutUrl.searchParams.set("client_id", process.env.KEYCLOAK_ID || "teman-belajar-admin");
    }
    return expireNextAuthCookies(req, NextResponse.redirect(logoutUrl));
  } catch {
    return expireNextAuthCookies(
      req,
      NextResponse.redirect(process.env.POST_LOGOUT_REDIRECT_URL || process.env.NEXTAUTH_URL || "http://localhost:3001"),
    );
  }
}
