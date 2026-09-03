import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");const failures=[];const read=path=>readFileSync(join(root,path),"utf8");const requireFile=path=>{if(!existsSync(join(root,path)))failures.push(`${path}: file wajib tidak ditemukan`)};const contains=(path,pattern,message)=>{if(!pattern.test(read(path)))failures.push(`${path}: ${message}`)};
const microlearningDetail = read("apps/portal-web/src/app/microlearning/[slug]/page.tsx") + read("apps/portal-web/src/components/techwind/index.tsx");
for(const path of ["services/portal-api/migrations/020_create_microlearning.sql","services/portal-api/internal/domain/microlearning/service.go","services/portal-api/internal/transport/http/handler/microlearning.go","apps/portal-web/src/app/microlearning/page.tsx","apps/portal-web/src/app/microlearning/[slug]/page.tsx","apps/portal-web/src/app/api/microlearning/[id]/progress/route.ts","apps/admin-web/src/app/dashboard/microlearning/page.tsx","docs/runbooks/MICROLEARNING-OPERATIONS.md"])requireFile(path);
contains("services/portal-api/migrations/020_create_microlearning.sql",/duration_minutes BETWEEN 3 AND 15[\s\S]*microlearning_progress[\s\S]*progress_percent/,"durasi dan resume state wajib tersimpan dengan batas eksplisit");
contains("services/portal-api/internal/domain/microlearning/service.go",/FormatVideo[\s\S]*u\.Scheme != "https"/,"format video wajib memakai URL HTTPS terkurasi");
contains("services/portal-api/internal/repository/postgres/microlearning_repository.go",/FormalCompletion: false[\s\S]*editorial_activity/,"progres wajib berprovenance Portal dan bukan completion formal");
contains("services/portal-api/cmd/api/main.go",/GET \/api\/v1\/microlearning[\s\S]*GET \/api\/v1\/me\/microlearning[\s\S]*POST \/api\/v1\/admin\/microlearning/,"public, learner, dan admin routes wajib terdaftar");
contains("openapi/openapi.yaml",/\/microlearning:[\s\S]*\/me\/microlearning\/\{id\}\/progress:[\s\S]*\/admin\/microlearning:/,"OpenAPI wajib mencakup seluruh surface microlearning");
contains("services/portal-api/internal/searchindex/postgres_sources.go",/MicrolearningSource[\s\S]*status='published'[\s\S]*indexable/,"search hanya boleh mengindeks materi terbit dan indexable");
contains("apps/portal-web/src/components/portal-chrome.tsx",/href: "\/microlearning", label: "Pembelajaran Singkat"/,"menu Pembelajaran Singkat wajib aktif pada route nyata");
if(!/LearningResource[\s\S]*Editorial Portal[\s\S]*Bukan completion Moodle/.test(microlearningDetail))failures.push("apps/portal-web/src/app/microlearning/[slug]/page.tsx + centralized Techwind foundation: detail wajib memuat SEO terstruktur dan provenance editorial");
contains("apps/portal-web/src/app/api/microlearning/[id]/progress/route.ts",/isSameOrigin[\s\S]*maxProgressBodyBytes[\s\S]*AbortSignal\.timeout\(5000\)[\s\S]*Cache-Control/,"BFF progres wajib membatasi origin, payload, timeout, dan cache");
contains("apps/admin-web/src/app/dashboard/microlearning/page.tsx",/MediaPicker imageOnly[\s\S]*Materi terkait[\s\S]*SEO publik/,"Admin wajib memakai Media Picker, related content, dan SEO");
if(/orange|amber|#f(?:59e0b|97316)/i.test(read("apps/admin-web/src/app/dashboard/microlearning/page.tsx")))failures.push("Admin microlearning: warna orange/amber dilarang");
if(failures.length){console.error(`Microlearning contract gagal (${failures.length}):\n- ${failures.join("\n- ")}`);process.exit(1)}console.log("Microlearning contract lulus.");
