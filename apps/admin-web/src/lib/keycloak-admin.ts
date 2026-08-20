const KEYCLOAK_INTERNAL_URL = process.env.KEYCLOAK_INTERNAL_URL || "http://keycloak:8080";
const KEYCLOAK_MANAGEMENT_CLIENT_ID = process.env.KEYCLOAK_MANAGEMENT_CLIENT_ID || "teman-belajar-admin-management";
const KEYCLOAK_MANAGEMENT_CLIENT_SECRET = process.env.KEYCLOAK_MANAGEMENT_CLIENT_SECRET || "";
const REALM = "teman-belajar";

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getKeycloakAdminToken(): Promise<string> {
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
    const data = await res.json();
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
