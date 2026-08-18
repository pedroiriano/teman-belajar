import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

import { hasUsableAccessToken, refreshKeycloakToken } from "@/lib/keycloak-token";

/**
 * Retrieves the decoded NextAuth JWT token from cookies on the server.
 * This is used by Server Components and API Route Handlers to securely
 * forward the user's access token to the Go Portal API.
 */
export async function getBackendAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  
  // Create a mock request object for getToken
  const req = {
    cookies: Object.fromEntries(cookieStore.getAll().map(c => [c.name, c.value])),
    headers: {},
  } as any;

  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET || "",
    });

    if (!token) return null;
    if (hasUsableAccessToken(token)) return token.accessToken as string;
    const refreshed = await refreshKeycloakToken(token);
    return typeof refreshed.accessToken === "string" && !refreshed.tokenError ? refreshed.accessToken : null;
  } catch (error) {
    console.error("Failed to decode NextAuth session token:", error);
    return null;
  }
}
