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
  pages: {
    error: "/sso/error",
  },
  events: {
    async signIn(message) {
      const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://localhost:8080";
      const secret = process.env.PORTAL_INTERNAL_SECRET || "default_internal_secret";
      fetch(`${API_BASE}/api/v1/internal/analytics/events`, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json",
          "X-Internal-Token": secret
        },
        body: JSON.stringify({ event_type: "sso.login_success", url: "/sso", referrer: "", metadata: {} })
      }).catch(console.error);
    },
    async signOut(message) {
      const API_BASE = process.env.PORTAL_API_INTERNAL_URL || "http://localhost:8080";
      const secret = process.env.PORTAL_INTERNAL_SECRET || "default_internal_secret";
      fetch(`${API_BASE}/api/v1/internal/analytics/events`, {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json",
          "X-Internal-Token": secret
        },
        body: JSON.stringify({ event_type: "sso.logout", url: "/sso", referrer: "", metadata: {} })
      }).catch(console.error);
    }
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


