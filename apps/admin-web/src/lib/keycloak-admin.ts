const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || "http://keycloak:8080";
const KEYCLOAK_MANAGEMENT_CLIENT_ID = process.env.KEYCLOAK_MANAGEMENT_CLIENT_ID || "teman-belajar-admin-management";
const KEYCLOAK_MANAGEMENT_CLIENT_SECRET = process.env.KEYCLOAK_MANAGEMENT_CLIENT_SECRET || "";
const REALM = "teman-belajar";

let cachedToken: { token: string; expiresAt: number } | null = null;

interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
}

function isKeycloakTokenResponse(value: unknown): value is KeycloakTokenResponse {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.access_token === "string" && candidate.access_token.length > 0 &&
    typeof candidate.expires_in === "number" && candidate.expires_in > 0;
}

export async function getKeycloakAdminToken(): Promise<string> {
  if (!KEYCLOAK_MANAGEMENT_CLIENT_SECRET) {
    throw new Error("Keycloak management client is not configured.");
  }
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30000) {
    return cachedToken.token;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const res = await fetch(`${KEYCLOAK_INTERNAL_URL}/realms/${REALM}/protocol/openid-connect/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: KEYCLOAK_MANAGEMENT_CLIENT_ID,
        client_secret: KEYCLOAK_MANAGEMENT_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("Keycloak management auth failed.");
    const data: unknown = await res.json();
    if (!isKeycloakTokenResponse(data)) throw new Error("Keycloak management auth returned an invalid response.");
    cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
    return data.access_token;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function kcAdminFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getKeycloakAdminToken();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s bounded timeout
  
  try {
    const res = await fetch(`${KEYCLOAK_INTERNAL_URL}/admin/realms/${REALM}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}
