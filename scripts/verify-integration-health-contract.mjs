import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = (path) => readFileSync(join(root, path), "utf8");
const requireFile = (path) => { if (!existsSync(join(root, path))) failures.push(`${path}: file wajib tidak ditemukan`); };
const contains = (path, pattern, message) => { if (!pattern.test(read(path))) failures.push(`${path}: ${message}`); };

const files = [
  "services/portal-api/internal/domain/integrationhealth/service.go",
  "services/portal-api/internal/adapters/healthprobe/probes.go",
  "services/portal-api/internal/transport/http/handler/integration_health.go",
  "services/portal-api/internal/workerhealth/recorder.go",
  "apps/admin-web/src/app/dashboard/integration-health/page.tsx",
  "docs/runbooks/INTEGRATION-HEALTH-CENTER-OPERATIONS.md",
  "docs/threat-models/TASK-018-INTEGRATION-HEALTH-CENTER.md",
];
files.forEach(requireFile);
contains("services/portal-api/internal/domain/integrationhealth/service.go", /context\.WithTimeout/, "timeout probe wajib ada");
contains("services/portal-api/internal/domain/integrationhealth/service.go", /failureThreshold:\s*3/, "circuit threshold wajib bounded");
contains("services/portal-api/internal/domain/integrationhealth/service.go", /allowedErrorClasses[\s\S]*circuit_open/, "error class wajib allowlisted");
contains("services/portal-api/cmd/api/integration_health.go", /portal-api[\s\S]*moodle[\s\S]*keycloak[\s\S]*meilisearch[\s\S]*redis[\s\S]*minio[\s\S]*search-worker[\s\S]*analytics-worker[\s\S]*prometheus[\s\S]*grafana[\s\S]*otel-collector[\s\S]*loki[\s\S]*tempo/, "probe dependency wajib fixed dan lengkap");
contains("services/portal-api/internal/transport/http/handler/integration_health.go", /Portal Administrator[\s\S]*RawQuery/, "authorization dan parameter rejection wajib ada");
contains("services/portal-api/internal/transport/http/handler/integration_health.go", /INTEGRATION_HEALTH_VIEWED/, "audit akses wajib ada");
contains("services/portal-api/internal/transport/http/handler/integration_health.go", /Cache-Control", "no-store"/, "response wajib no-store");
contains("openapi/openapi.yaml", /\/admin\/integration-health:[\s\S]*IntegrationHealthSnapshot[\s\S]*correlation_path/, "OpenAPI health center wajib lengkap");
contains("apps/admin-web/src/components/admin-shell.tsx", /\/dashboard\/integration-health[\s\S]*requiredRole: "Portal Administrator"/, "menu wajib aktif hanya untuk Portal Administrator");
if (/\/dashboard\/integration-health[^\n]*disabled:\s*true/.test(read("apps/admin-web/src/components/admin-shell.tsx"))) failures.push("menu Integration Health masih berstatus Segera");
contains("apps/admin-web/src/app/dashboard/integration-health/page.tsx", /Portal Administrator/, "Admin wajib deny-by-default");
contains("apps/admin-web/src/app/dashboard/integration-health/page.tsx", /CORRELATION_PATH[\s\S]*correlationPathSafe/, "correlation link wajib sanitized");
contains("apps/admin-web/src/app/dashboard/integration-health/page.tsx", /aria-labelledby/, "struktur accessible wajib ada");
contains("apps/admin-web/src/app/dashboard/integration-health/page.tsx", /md:grid-cols-2/, "layout responsive wajib ada");
for (const path of ["apps/admin-web/src/app/dashboard/integration-health/page.tsx", "apps/admin-web/src/components/admin-shell.tsx"]) {
  if (/orange|amber|#(?:f59e0b|f97316)/i.test(read(path))) failures.push(`${path}: warna orange/amber dilarang`);
}
if (failures.length) {
  console.error(`Integration health contract gagal (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Integration health contract lulus.");
