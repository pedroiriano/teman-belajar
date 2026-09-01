import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const backend = [
  "services/portal-api/internal/domain/learningpath/service.go",
  "services/portal-api/internal/application/learningpath/source_adapter.go",
  "services/portal-api/internal/repository/postgres/learning_path_repository.go",
  "services/portal-api/internal/transport/http/handler/learning_path.go",
  "services/portal-api/migrations/024_create_learning_paths.sql",
].map(read).join("\n");
const admin = read("apps/admin-web/src/app/dashboard/learning-paths/page.tsx") + read("apps/admin-web/src/components/admin-shell.tsx");
const portal = read("apps/portal-web/src/app/learning-paths/[slug]/page.tsx") + read("apps/portal-web/src/components/portal-chrome.tsx");
const portalClient = read("apps/portal-web/src/lib/learning-paths.ts");
const openapi = read("openapi/openapi.yaml");

const assertions = [
  [backend.includes("validateDAG") && backend.includes("ErrOrphanSource") && backend.includes("ErrUnauthorizedSource"), "graph/source validation missing"],
  [backend.includes("BindLearnerVersion") && backend.includes("published_version_number"), "stable learner version binding missing"],
  [backend.includes("KindWebinar") && backend.includes("blocked_task015") && backend.includes("SourceUnavailable"), "TASK-015 degraded contract missing"],
  [backend.includes("DisallowUnknownFields") && backend.includes("MaxBytesReader"), "strict bounded API writes missing"],
  [admin.includes("Susun pengalaman bertahap") && admin.includes("Prerequisite") && admin.includes("Buat revisi baru"), "Admin composer/version workflow incomplete"],
  [admin.includes('href: "/dashboard/learning-paths"') && !admin.includes('{ label: "Jalur Belajar", icon: "book", disabled: true }'), "Admin route not active"],
  [portal.includes("Langkah berikutnya") && portal.includes("Moodle") && portal.includes("Sumber terganggu"), "Portal journey/degraded state incomplete"],
  [portal.includes('href: "/learning-paths"') && portal.includes('label: "Jalur Belajar"'), "Portal route not active"],
  [portalClient.includes('cache:"no-store"'), "publish visibility cache guard missing"],
  [openapi.includes("/learning/me/learning-paths/{slug}:") && openapi.includes("/admin/learning-paths/{id}/revisions:"), "OpenAPI learning path surface incomplete"],
];
const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("Learning Paths contract: PASS");
