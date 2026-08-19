type OidcIdTokenClaims = {
  sid?: unknown;
};

export function readOidcSessionId(idToken: unknown): string | undefined {
  if (typeof idToken !== "string") return undefined;
  const payload = idToken.split(".")[1];
  if (!payload) return undefined;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as OidcIdTokenClaims;
    return typeof claims.sid === "string" && claims.sid.length > 0 ? claims.sid : undefined;
  } catch {
    return undefined;
  }
}
