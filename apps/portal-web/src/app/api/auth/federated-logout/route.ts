import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    
    // Clear NextAuth session cookies
    const cookieStore = await cookies();
    cookieStore.delete("next-auth.session-token");
    cookieStore.delete("__Secure-next-auth.session-token");

    if (token && token.idToken) {
      const issuer = process.env.KEYCLOAK_ISSUER || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar";
      const postLogoutUrl = encodeURIComponent(process.env.NEXTAUTH_URL || "http://localhost:3000");
      const url = `${issuer}/protocol/openid-connect/logout?id_token_hint=${token.idToken}&post_logout_redirect_uri=${postLogoutUrl}`;
      return NextResponse.redirect(url);
    }
  } catch (e) {
    console.error("Federated logout error:", e);
  }
  
  return NextResponse.redirect(process.env.NEXTAUTH_URL || "http://localhost:3000");
}
