import "server-only";

import { cookies } from "next/headers";
import { getToken } from "next-auth/jwt";

export async function getServerAccessToken(): Promise<string | null> {
  const token = await getToken({
    req: { headers: { cookie: cookies().toString() } } as never,
    secret: process.env.NEXTAUTH_SECRET,
  });

  return typeof token?.accessToken === "string" ? token.accessToken : null;
}
