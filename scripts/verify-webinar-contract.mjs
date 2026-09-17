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

const adminWorkspace = read("apps/admin-web/src/components/webinars/cuba-webinar-workspace.tsx");

const checks = [
  [openapi.includes("/webinars/{id}/registrations:"), "OpenAPI registration contract"],
  [openapi.includes("Idempotency-Key"), "OpenAPI idempotency header"],
  [chrome.includes('{ href: "/webinars", label: "Webinar"'), "Webinar navigation is active"],
  [proxy.includes("sameOrigin(request)") && proxy.includes('"Idempotency-Key": key'), "BFF mutation protections"],
  [page.includes("listPublicWebinars") && !page.includes("ComingSoonState"), "Webinar list is active with Techwind design"],
  [detail.includes("getPublicWebinarDetail") && detail.includes("WebinarActions") && !detail.includes("ComingSoonState"), "Webinar detail is active and interactive"],
  [actions.includes("fetch(`/api/webinars/") && actions.includes("createPortal"), "Webinar actions support native interactive registration"],
  [adminWorkspace.includes('data-cuba-component="webinar-workspace"') && adminWorkspace.includes("AdminDataTable"), "Admin workspace uses Cuba foundation and AdminDataTable"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error(`FAIL ${label}`);
  process.exit(1);
}
console.log("PASS native LXP webinar contract and activation verification");
