import "server-only";

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth";

/**
 * Retrieves the Keycloak access token from the current server-side session.
 *
 * Uses getServerSession (which respects the custom cookie config in authOptions)
 * to read the JWT, then extracts the accessToken stored by the jwt callback.
 */
export async function getServerAccessToken(): Promise<string | null> {
  const session: any = await getServerSession(authOptions);
  return typeof session?.accessToken === "string" ? session.accessToken : null;
}
