import { NextAuthOptions } from "next-auth";
import KeycloakProvider from "next-auth/providers/keycloak";
import { jwtDecode } from "jwt-decode";

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
      }
      return token;
    },
    async session({ session, token }: any) {
      session.roles = token.roles;
      return session;
    },
  },
};
