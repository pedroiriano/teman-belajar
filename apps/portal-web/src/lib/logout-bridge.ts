import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const SIGNED_PARAMETER_NAMES = ["return", "ts", "nonce", "sig"] as const;
const MAX_AGE_SECONDS = 60;

function getBridgeSecret(): string {
  const secret = process.env.SSO_LOGOUT_BRIDGE_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Logout bridge is not configured securely.");
  }
  return secret;
}

function sign(returnUrl: string, issuedAt: string, nonce: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(`${returnUrl}\n${issuedAt}\n${nonce}`)
    .digest("hex");
}

function createSignedBridgeUrl(baseUrl: string, path: string, returnUrl: URL): URL {
  const secret = getBridgeSecret();
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const nonce = randomUUID();
  const bridgeUrl = new URL(path, baseUrl);
  bridgeUrl.searchParams.set("return", returnUrl.toString());
  bridgeUrl.searchParams.set("ts", issuedAt);
  bridgeUrl.searchParams.set("nonce", nonce);
  bridgeUrl.searchParams.set("sig", sign(returnUrl.toString(), issuedAt, nonce, secret));
  return bridgeUrl;
}

function getVerifiedReturnUrl(signedUrl: URL, secret: string): URL | null {
  if (
    [...signedUrl.searchParams.keys()].length !== SIGNED_PARAMETER_NAMES.length ||
    SIGNED_PARAMETER_NAMES.some((name) => signedUrl.searchParams.getAll(name).length !== 1)
  ) {
    return null;
  }

  const returnValue = signedUrl.searchParams.get("return");
  const issuedAt = signedUrl.searchParams.get("ts");
  const nonce = signedUrl.searchParams.get("nonce");
  const signature = signedUrl.searchParams.get("sig");
  if (
    !returnValue ||
    !issuedAt ||
    !nonce ||
    !signature ||
    !/^\d{10}$/.test(issuedAt) ||
    !/^[0-9a-f]{64}$/.test(signature) ||
    !/^[0-9a-f-]{36}$/i.test(nonce)
  ) {
    return null;
  }

  const issuedAtNumber = Number(issuedAt);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(issuedAtNumber) || Math.abs(now - issuedAtNumber) > MAX_AGE_SECONDS) {
    return null;
  }

  const expected = Buffer.from(sign(returnValue, issuedAt, nonce, secret), "hex");
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }

  try {
    return new URL(returnValue);
  } catch {
    return null;
  }
}

export function createMoodleLogoutBridgeUrl(returnUrl: URL): URL {
  const moodleBaseUrl = process.env.MOODLE_PUBLIC_BASE_URL;
  if (!moodleBaseUrl) {
    throw new Error("Moodle logout bridge is not configured securely.");
  }
  return createSignedBridgeUrl(moodleBaseUrl, "/local/temanbelajar/logout_bridge.php", returnUrl);
}

export function createWebLogoutBridgeUrl(webBaseUrl: string, returnUrl: URL): URL {
  return createSignedBridgeUrl(webBaseUrl, "/api/auth/logout-bridge", returnUrl);
}

export function validateWebLogoutBridgeRequest(requestUrl: URL, expectedFinalReturnUrl: URL): URL | null {
  const secret = getBridgeSecret();
  const nextHop = getVerifiedReturnUrl(requestUrl, secret);
  const moodleBaseUrl = process.env.MOODLE_PUBLIC_BASE_URL;
  if (!nextHop || !moodleBaseUrl) return null;

  const expectedMoodleBridge = new URL("/local/temanbelajar/logout_bridge.php", moodleBaseUrl);
  if (nextHop.origin !== expectedMoodleBridge.origin || nextHop.pathname !== expectedMoodleBridge.pathname) {
    return null;
  }

  const finalReturnUrl = getVerifiedReturnUrl(nextHop, secret);
  if (!finalReturnUrl || finalReturnUrl.toString() !== expectedFinalReturnUrl.toString()) {
    return null;
  }
  return nextHop;
}

function isExpectedMoodleKeycloakLogoutUrl(url: URL): boolean {
  const issuer = process.env.KEYCLOAK_ISSUER;
  const moodleBaseUrl = process.env.MOODLE_PUBLIC_BASE_URL;
  if (!issuer || !moodleBaseUrl || url.hash || url.username || url.password) return false;

  const expected = new URL(`${issuer.replace(/\/+$/, "")}/protocol/openid-connect/logout`);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname) return false;
  if (
    [...url.searchParams.keys()].length !== 2 ||
    url.searchParams.getAll("client_id").length !== 1 ||
    url.searchParams.getAll("post_logout_redirect_uri").length !== 1
  ) {
    return false;
  }

  return url.searchParams.get("client_id") === "teman-belajar-moodle"
    && url.searchParams.get("post_logout_redirect_uri") === moodleBaseUrl.replace(/\/+$/, "");
}

export function validateMoodleInitiatedPortalBridgeRequest(requestUrl: URL): URL | null {
  const secret = getBridgeSecret();
  const adminBridge = getVerifiedReturnUrl(requestUrl, secret);
  const adminBaseUrl = process.env.ADMIN_PUBLIC_BASE_URL;
  if (!adminBridge || !adminBaseUrl) return null;

  const expectedAdminBridge = new URL("/api/auth/moodle-logout-bridge", adminBaseUrl);
  if (adminBridge.origin !== expectedAdminBridge.origin || adminBridge.pathname !== expectedAdminBridge.pathname) {
    return null;
  }

  const keycloakLogout = getVerifiedReturnUrl(adminBridge, secret);
  return keycloakLogout && isExpectedMoodleKeycloakLogoutUrl(keycloakLogout) ? adminBridge : null;
}
