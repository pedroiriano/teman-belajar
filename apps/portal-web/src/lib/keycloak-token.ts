type RefreshableToken = {
  accessToken?: unknown;
  refreshToken?: unknown;
  expiresAt?: unknown;
  tokenError?: unknown;
  [key: string]: unknown;
};

type KeycloakRefreshResponse = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
};

export function hasUsableAccessToken(token: RefreshableToken, skewSeconds = 30) {
  return typeof token.accessToken === "string"
    && typeof token.expiresAt === "number"
    && Date.now() < (token.expiresAt - skewSeconds) * 1000;
}

export async function refreshKeycloakToken(token: RefreshableToken): Promise<RefreshableToken> {
  const refreshToken = typeof token.refreshToken === "string" ? token.refreshToken : "";
  const issuer = process.env.KEYCLOAK_ISSUER;
  const clientId = process.env.KEYCLOAK_ID;
  const clientSecret = process.env.KEYCLOAK_SECRET;
  if (!refreshToken || !issuer || !clientId || !clientSecret) return { ...token, tokenError: "RefreshUnavailable" };

  try {
    const response = await fetch(`${issuer}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return { ...token, tokenError: "RefreshFailed" };

    const refreshed = await response.json() as KeycloakRefreshResponse;
    if (typeof refreshed.access_token !== "string" || typeof refreshed.expires_in !== "number") {
      return { ...token, tokenError: "RefreshInvalid" };
    }
    return {
      ...token,
      accessToken: refreshed.access_token,
      refreshToken: typeof refreshed.refresh_token === "string" ? refreshed.refresh_token : refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + refreshed.expires_in,
      tokenError: undefined,
    };
  } catch {
    return { ...token, tokenError: "RefreshFailed" };
  }
}
