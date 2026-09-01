import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const domain = read("services/portal-api/internal/domain/platformconfig/model.go");
const backend = [domain, read("services/portal-api/internal/application/platformconfig/service.go"), read("services/portal-api/internal/repository/postgres/platform_config_repository.go"), read("services/portal-api/internal/transport/http/handler/platform_config.go"), read("services/portal-api/migrations/022_create_platform_configuration.sql"), read("services/portal-api/cmd/api/main.go")].join("\n");
const admin = ["apps/admin-web/src/components/platform-configuration-editor.tsx", "apps/admin-web/src/app/dashboard/platform-configuration/page.tsx", "apps/admin-web/src/components/admin-shell.tsx"].map(read).join("\n");
const portal = ["apps/portal-web/src/lib/platform-configuration.ts", "apps/portal-web/src/components/portal-chrome.tsx", "apps/portal-web/src/app/page.tsx"].map(read).join("\n");

const assertions = [
  [backend.includes("DisallowUnknownFields"), "schema must deny unknown keys"],
  [backend.includes("PLATFORM_CONFIG_EXTERNAL_HOST_ALLOWLIST"), "external host allowlist must be server controlled"],
  [backend.includes("pg_advisory_xact_lock"), "publish/version operations must be serialized"],
  [backend.includes("ErrVersionConflict"), "optimistic conflict handling missing"],
  [backend.includes('Source: "fallback"'), "compiled safe fallback missing"],
  [backend.includes("Portal Administrator"), "deny-by-default role gate missing"],
  [!/(client_secret|database_url|api_key)\s+[^=]*`json:/.test(domain), "secret fields must not be configurable"],
  [admin.includes("Pratinjau privat") && admin.includes("Rollback sebagai versi baru"), "Admin workflow incomplete"],
  [admin.includes('href: "/dashboard/platform-configuration"') && !admin.includes('{ label: "Konfigurasi", icon: "settings", disabled: true }'), "Admin navigation activation missing"],
  [portal.includes("configuration.footer.summary") && portal.includes("sectionProps"), "Portal configuration consumer incomplete"],
  [portal.includes("comingSoon: true"), "inactive routes must remain Segera"],
];
const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Platform configuration contract: PASS");
