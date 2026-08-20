import { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";

import { ADMIN_SESSION_COOKIE_NAME } from "@/lib/auth-cookies";

interface KeycloakTokenParsed {
  sid?: string;
  realm_access?: {
    roles: string[];
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    KeycloakProvider({
      clientId: process.env.KEYCLOAK_ID || "teman-belajar-admin",
      clientSecret: process.env.KEYCLOAK_SECRET || "",
      issuer: process.env.KEYCLOAK_ISSUER || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar",
      authorization: {
        params: {
          scope: "openid profile email",
        },
      },
    }),
  ],
  cookies: { sessionToken: { name: ADMIN_SESSION_COOKIE_NAME, options: { httpOnly: true, sameSite: "none", path: "/", secure: true } }, callbackUrl: { name: "admin-next-auth.callback-url", options: { sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } }, csrfToken: { name: "admin-next-auth.csrf-token", options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } }, pkceCodeVerifier: { name: "admin-next-auth.pkce.code_verifier", options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } }, state: { name: "admin-next-auth.state", options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } }, nonce: { name: "admin-next-auth.nonce", options: { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" } } }, session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.expiresAt = account.expires_at;

        if (account.access_token) {
          try {
            const decoded = jwtDecode<KeycloakTokenParsed>(account.access_token);
            token.roles = decoded.realm_access?.roles || [];
          } catch (error) {
            console.error("Error decoding token", error);
            token.roles = [];
          }
        }
        if (account.id_token) {
          try {
            token.oidcSid = jwtDecode<KeycloakTokenParsed>(account.id_token).sid;
          } catch {
            token.oidcSid = undefined;
          }
        }
        return token;
      }

      if (Date.now() < (token.expiresAt as number) * 1000 - 60000) {
        return token;
      }

      try {
        const url = `${process.env.KEYCLOAK_ISSUER || "http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar"}/protocol/openid-connect/token`;
        const response = await fetch(url, {
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: process.env.KEYCLOAK_ID || "teman-belajar-admin",
            client_secret: process.env.KEYCLOAK_SECRET || "",
            grant_type: "refresh_token",
            refresh_token: token.refreshToken as string,
          }),
          method: "POST",
        });

        const tokens = await response.json();
        if (!response.ok) throw tokens;

        return {
          ...token,
          accessToken: tokens.access_token,
          expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
          refreshToken: tokens.refresh_token ?? token.refreshToken,
        };
      } catch (error) {
        console.error("Error refreshing access token", error);
        return { ...token, error: "RefreshAccessTokenError" };
      }
    },
    async session({ session, token }) {
	  session.roles = Array.isArray(token.roles) ? token.roles : [];
	  session.actorId = token.sub;
      return session;
    },
  },
};

