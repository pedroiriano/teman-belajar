import { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";

import { hasUsableAccessToken, refreshKeycloakToken } from "@/lib/keycloak-token";
import { readOidcSessionId } from "@/lib/oidc-session";

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID || "teman-belajar-web",
      clientSecret: process.env.KEYCLOAK_SECRET || "",
      issuer: process.env.KEYCLOAK_ISSUER || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.idToken = account.id_token;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;
        token.oidcSid = readOidcSessionId(account.id_token);
        token.tokenError = undefined;
        return token;
      }
      if (hasUsableAccessToken(token)) return token;
      return refreshKeycloakToken(token);
    },
    async session({ session }: any) {
      return session;
    },
  },
};
