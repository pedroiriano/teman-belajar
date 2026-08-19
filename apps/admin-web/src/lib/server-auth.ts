import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

export async function getServerAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = await getToken({
    req: { headers: { cookie: cookieStore.toString() } } as never,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "admin-next-auth.session-token",
  });

  return typeof token?.accessToken === "string" ? token.accessToken : null;
}
