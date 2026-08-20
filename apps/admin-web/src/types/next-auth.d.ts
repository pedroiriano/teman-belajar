import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session extends DefaultSession {
    actorId?: string;
    roles: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    expiresAt?: number;
    idToken?: string;
    oidcSid?: string;
    refreshToken?: string;
    roles?: string[];
    error?: string;
  }
}
