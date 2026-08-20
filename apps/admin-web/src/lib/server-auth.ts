import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

/**
 * Retrieves the Keycloak access token from the current server-side session.
 *
 * Decodes the encrypted, HttpOnly Admin session cookie only on the server. The
 * public NextAuth session response intentionally never exposes bearer tokens.
 */
export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const req = {
    cookies: Object.fromEntries(cookieStore.getAll().map((cookie) => [cookie.name, cookie.value])),
    headers: {},
  } as any;

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "",
      cookieName: ADMIN_SESSION_COOKIE_NAME,
    });
    if (!token) return null;

    const expiresAt = typeof token.expiresAt === "number" ? token.expiresAt : 0;
    if (typeof token.accessToken === "string" && Date.now() < expiresAt * 1000 - 60_000) {
      return token.accessToken;
    }

    if (typeof token.refreshToken !== "string") return null;
    const issuer = process.env.KEYCLOAK_ISSUER
      || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar";
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.KEYCLOAK_ID || "teman-belajar-admin",
        client_secret: process.env.KEYCLOAK_SECRET || "",
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const refreshed = await response.json() as { access_token?: unknown };
    return typeof refreshed.access_token === "string" ? refreshed.access_token : null;
  } catch (error) {
    console.error("Failed to decode Admin session token:", error);
    return null;
  }
}
