import fs from "node:fs";
import path from "node:path";

const root = process.cwd().endsWith("admin-web") ? path.resolve(process.cwd(), "../..") : process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];
const contains = (file, pattern, message) => { if (!pattern.test(read(file))) failures.push(message); };

for (const file of [
  "services/portal-api/internal/transport/http/handler/audit_center.go",
  "services/portal-api/internal/application/auditcenter/service.go",
  "apps/admin-web/src/app/dashboard/audit/page.tsx",
  "apps/admin-web/src/app/dashboard/audit/[id]/page.tsx",
  "apps/admin-web/src/app/api/bff/audit/export/route.ts",
  "services/portal-api/migrations/021_add_audit_center.sql",
]) if (!fs.existsSync(path.join(root, file))) failures.push(`missing ${file}`);

contains("openapi/openapi.yaml", /\/admin\/audit-events:[\s\S]*AuditEventPage[\s\S]*\/admin\/audit-events\/export:/, "OpenAPI Audit Center belum lengkap");
contains("apps/admin-web/src/components/admin-shell.tsx", /\/dashboard\/audit[\s\S]*requiredRole: "Portal Administrator"/, "menu Audit wajib role-gated");
contains("services/portal-api/internal/application/auditcenter/service.go", /MaxExportRows\s*=\s*10000[\s\S]*RetentionDays\s*=\s*365/, "batas export dan retention wajib dipaksakan server-side");
contains("services/portal-api/internal/transport/http/handler/audit_center.go", /MaskIP[\s\S]*Cache-Control/, "IP masking dan no-store wajib dipaksakan server-side");
contains("services/portal-api/internal/domain/audit/policy.go", /allowedMetadata[\s\S]*sensitiveFragments[\s\S]*\/24[\s\S]*\/48/, "privacy/redaction policy wajib tersedia");
contains("apps/admin-web/src/app/dashboard/audit/page.tsx", /Portal Administrator/, "Admin Audit harus deny-by-default");
contains("apps/admin-web/src/app/dashboard/audit/page.tsx", /overflow-x-auto/, "Admin Audit harus responsive");
contains("apps/admin-web/src/app/dashboard/audit/page.tsx", /aria-labelledby/, "Admin Audit harus accessible");

for (const file of ["apps/admin-web/src/app/dashboard/audit/page.tsx", "apps/admin-web/src/app/dashboard/audit/[id]/page.tsx"]) {
  if (/\b(?:orange|amber)-\d{2,3}\b/.test(read(file))) failures.push(`${file} menggunakan warna terlarang`);
}

if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Audit Center contract: PASS");
