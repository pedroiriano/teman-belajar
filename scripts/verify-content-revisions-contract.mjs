import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const failures = [];

// 1. OpenAPI Specification Checks
const openapi = read("openapi/openapi.yaml");
const expectedOpenApiEndpoints = [
  "/admin/news/{id}/revisions:",
  "/admin/news/{id}/rollback:",
  "/admin/announcements/{id}/revisions:",
  "/admin/announcements/{id}/rollback:",
  "NewsRevision:",
  "AnnouncementRevision:",
  "RollbackRevisionRequest:",
];
for (const item of expectedOpenApiEndpoints) {
  if (!openapi.includes(item)) {
    failures.push(`openapi/openapi.yaml: definisi ${item} tidak ditemukan`);
  }
}

// 2. Portal API Repository Checks
const cmsRepo = read("services/portal-api/internal/domain/cms/repository.go");
for (const method of ["GetNewsRevision", "GetAnnouncementRevision", "ListNewsRevisions", "ListAnnouncementRevisions"]) {
  if (!cmsRepo.includes(method)) {
    failures.push(`services/portal-api/internal/domain/cms/repository.go: method ${method} tidak ditemukan`);
  }
}

// 3. Portal API Service Checks
const cmsService = read("services/portal-api/internal/domain/cms/service.go");
for (const method of ["RollbackNews", "RollbackAnnouncement", "ListNewsRevisions", "ListAnnouncementRevisions"]) {
  if (!cmsService.includes(method)) {
    failures.push(`services/portal-api/internal/domain/cms/service.go: method ${method} tidak ditemukan`);
  }
}

// 4. Portal API Handler Checks
const cmsHandler = read("services/portal-api/internal/transport/http/handler/cms.go");
for (const handler of ["RollbackNews", "RollbackAnnouncement", "ListNewsRevisions", "ListAnnouncementRevisions"]) {
  if (!cmsHandler.includes(handler)) {
    failures.push(`services/portal-api/internal/transport/http/handler/cms.go: handler ${handler} tidak ditemukan`);
  }
}

// 5. Admin Web Server Action Checks
const versioningAction = read("apps/admin-web/src/app/actions/content-versioning.ts");
if (!versioningAction.includes("/api/v1/admin/news/${articleId}/rollback")) {
  failures.push("apps/admin-web/src/app/actions/content-versioning.ts: endpoint rollback news tidak dipanggil");
}
if (!versioningAction.includes("/api/v1/admin/announcements/${articleId}/rollback")) {
  failures.push("apps/admin-web/src/app/actions/content-versioning.ts: endpoint rollback announcements tidak dipanggil");
}

// 6. Cuba Versioning UI Component Checks
const diffViewer = read("apps/admin-web/src/components/versioning/cuba-diff-viewer.tsx");
if (!diffViewer.includes("side-by-side") || !diffViewer.includes("unified")) {
  failures.push("apps/admin-web/src/components/versioning/cuba-diff-viewer.tsx: mode side-by-side atau unified tidak lengkap");
}

if (failures.length > 0) {
  console.error("Content revisions contract verification FAILED:");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Kontrak Content Revisions, Snapshot, dan Visual Diff Viewer LULUS 100%.");
