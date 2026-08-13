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
  const sessionToken = 
    cookieStore.get("__Secure-next-auth.session-token")?.value ||
    cookieStore.get("next-auth.session-token")?.value;

  if (!sessionToken) {
    return null;
  }

  try {
    const decoded = await decode({
      token: sessionToken,
      secret: process.env.NEXTAUTH_SECRET || "",
    });

    return (decoded?.accessToken as string) || null;
  } catch (error) {
    console.error("Failed to decode NextAuth session token:", error);
    return null;
  }
}
