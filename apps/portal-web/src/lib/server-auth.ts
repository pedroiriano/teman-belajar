import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

/**
 * Retrieves the decoded NextAuth JWT token from cookies on the server.
 * This is used by Server Components and API Route Handlers to securely
 * forward the user's access token to the Go Portal API.
 */
export async function getBackendAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  
  // NextAuth stores cookies differently based on whether it is running on https (production) or http
  const secureCookie = cookieStore.get("__Secure-next-auth.session-token");
  const sessionToken = secureCookie?.value || cookieStore.get("next-auth.session-token")?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const salt = secureCookie ? "__Secure-next-auth.session-token" : "next-auth.session-token";
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET || "",
      salt: salt,
    });

    return (decoded?.accessToken as string) || null;
  } catch (error) {
    console.error("Failed to decode NextAuth session token:", error);
    return null;
  }
}
