const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || "http://keycloak:8080";
const KEYCLOAK_ADMIN_USER = process.env.KEYCLOAK_ADMIN_USER || "admin";
const KEYCLOAK_ADMIN_PASSWORD = process.env.KEYCLOAK_ADMIN_PASSWORD || "";
const REALM = "teman-belajar";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getKeycloakAdminToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 30000) {
    return cachedToken.token;
  }
  const res = await fetch(`${KEYCLOAK_INTERNAL_URL}/realms/master/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: "admin-cli",
      username: KEYCLOAK_ADMIN_USER,
      password: KEYCLOAK_ADMIN_PASSWORD,
      grant_type: "password",
    }),
  });
  if (!res.ok) throw new Error(`Keycloak admin auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = { token: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

export async function kcAdminFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = await getKeycloakAdminToken();
  return fetch(`${KEYCLOAK_INTERNAL_URL}/admin/realms/${REALM}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
  });
}
