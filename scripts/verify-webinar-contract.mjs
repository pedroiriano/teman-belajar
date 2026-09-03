import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = path => readFileSync(resolve(root, path), "utf8");
const openapi = read("openapi/openapi.yaml");
const chrome = read("apps/portal-web/src/components/portal-chrome.tsx");
const proxy = read("apps/portal-web/src/app/api/webinars/[id]/registration/route.ts");
const page = read("apps/portal-web/src/app/webinars/page.tsx");
const detail = read("apps/portal-web/src/app/webinars/[id]/page.tsx");
const actions = read("apps/portal-web/src/components/webinars/webinar-actions.tsx");

const checks = [
  [openapi.includes("/webinars/{id}/registrations:"), "OpenAPI registration contract"],
  [openapi.includes("Idempotency-Key"), "OpenAPI idempotency header"],
  [chrome.includes('{ label: "Webinar", description: "Sesi langsung bersama narasumber.", comingSoon: true }'), "Webinar navigation remains gated"],
  [proxy.includes("sameOrigin(request)") && proxy.includes('"Idempotency-Key": key'), "BFF mutation protections"],
  [page.includes("ComingSoonState") && !page.includes("listWebinars") && !page.includes("redirect("), "Webinar list remains dummy and gated"],
  [detail.includes("ComingSoonState") && !detail.includes("getWebinar") && !detail.includes("WebinarActions"), "Webinar detail remains dummy and gated"],
  [actions.includes("ComingSoonState") && !actions.includes("fetch(") && !actions.includes("Registrasi berhasil"), "Webinar actions fail closed"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(`FAIL ${label}`);
  process.exit(1);
}
console.log("PASS webinar contract and activation gate");
