import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const read = path => readFileSync(join(root, path), "utf8");
const requireFile = path => { if (!existsSync(join(root, path))) failures.push(`${path}: file wajib tidak ditemukan`); };
const contains = (path, pattern, message) => { if (!pattern.test(read(path))) failures.push(`${path}: ${message}`); };

for (const path of [
  "services/portal-api/migrations/019_create_training_programs.sql",
  "services/portal-api/internal/domain/training/service.go",
  "services/portal-api/internal/transport/http/handler/training.go",
  "apps/portal-web/src/app/training-programs/page.tsx",
  "apps/portal-web/src/app/training-programs/[slug]/page.tsx",
  "apps/admin-web/src/app/dashboard/training-programs/page.tsx",
  "docs/runbooks/FULL-TRAINING-PROGRAMS-OPERATIONS.md",
]) requireFile(path);

contains("services/portal-api/migrations/019_create_training_programs.sql", /training_program_courses[\s\S]*moodle_course_id[\s\S]*training_program_cohorts/, "composition dan cohort harus tersimpan tanpa learning state Moodle");
contains("services/portal-api/internal/domain/training/service.go", /Eligibility\{Status: "unverified"[\s\S]*Kind: "check_access"/, "akses yang belum dikonfirmasi wajib memakai unverified/check_access");
contains("services/portal-api/internal/domain/training/service.go", /Provenance\{Source: "moodle"[\s\S]*State: "degraded"/, "degradasi Moodle wajib memiliki provenance");
contains("services/portal-api/cmd/api/main.go", /GET \/api\/v1\/training-programs[\s\S]*GET \/api\/v1\/learning\/me\/training-programs[\s\S]*POST \/api\/v1\/admin\/training-programs/, "public, learner, dan admin routes wajib terdaftar");
contains("openapi/openapi.yaml", /\/training-programs:[\s\S]*\/learning\/me\/training-programs\/\{slug\}:[\s\S]*\/admin\/training-programs:/, "OpenAPI wajib mencakup seluruh surface program");
contains("apps/portal-web/src/components/portal-chrome.tsx", /href: "\/training-programs", label: "Pelatihan Penuh"/, "menu Pelatihan Penuh wajib aktif pada route nyata");
contains("apps/portal-web/src/app/training-programs/[slug]/page.tsx", /learner\.authenticated[\s\S]*Masuk untuk memeriksa akses[\s\S]*provenance\.state === "degraded"/, "detail wajib menangani unauthorized dan degraded state");
contains("apps/portal-web/src/app/training-programs/[slug]/page.tsx", /role="progressbar"[\s\S]*aria-valuenow/, "progres wajib aksesibel");
contains("apps/portal-web/src/lib/training-programs.ts", /getTrainingProgram[\s\S]*cache: "no-store"/, "detail publik wajib segera mengikuti transisi publish/archive tanpa cache stale");
contains("apps/admin-web/src/app/dashboard/training-programs/page.tsx", /Komposisi course[\s\S]*Cohort dan jadwal[\s\S]*Alur publikasi/, "workspace Admin wajib mencakup composition, cohort, dan workflow");

const migration = read("services/portal-api/migrations/019_create_training_programs.sql");
for (const forbidden of ["enrolment_state", "completion_state", "grade_value", "moodle_user_id"]) {
  if (migration.includes(forbidden)) failures.push(`migration 019: state Moodle authoritative tidak boleh disalin (${forbidden})`);
}
if (/orange|amber|#f(?:59e0b|97316)/i.test(read("apps/admin-web/src/app/dashboard/training-programs/page.tsx"))) failures.push("Admin training programs: warna orange/amber dilarang");

if (failures.length) {
  console.error(`Training program contract gagal (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log("Training program contract lulus.");
