import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

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

    return (token?.accessToken as string) || null;
  } catch (error) {
    console.error("Failed to decode NextAuth session token:", error);
    return null;
  }
}
