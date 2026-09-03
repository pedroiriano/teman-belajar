# Techwind UI/UX Inner Pages & Learner Journey Modernization Handoff

## 1. Executive Summary
Penyempurnaan tahap ini berfokus pada modernisasi halaman detail dan *journey* pembelajar di **Web Publik (`apps/portal-web`)** mengadopsi standar resmi Techwind (`vendor/ui-templates/techwind/ORIGINAL/html/course-detail.html` dan `C:\Datas\Proyek\UI\techwind-pembelajaran\assets\css\learning-pages.css`).

Penyempurnaan meliputi:
1. **Hero Halaman Dalam (`DetailHero` & `CourseDetailHero`)**: Dukungan gambar latar belakang tematis bergradasi gelap (`bg-slate-900/80`), *integrated breadcrumbs* di bagian bawah hero (`bottom-5`), serta pembagi lengkungan ombak SVG (*signature Techwind wave shape divider*).
2. **Interactive Roadmap Timeline (`LearningPathStepCard`)**: Mengubah daftar tahapan belajar menjadi roadmap linier interaktif dengan garis vertikal konektor, avatar step bulat berkode warna status (selesai / langkah aktif / terkunci), dan kartu materi terstruktur.
3. **Dashboard Pembelajar (`/my-learning` & `CourseList`)**: Menambahkan sistem tab filter status kursus (`Semua`, `Sedang Berjalan`, `Selesai`) bergaya *pills*, indikator progres visual, dan kartu sertifikat kelulusan yang elegan.
4. **Detail Pembelajaran Singkat (`/microlearning/[slug]`)**: Hero terintegrasi breadcrumbs dan wave divider, player video 16:9 yang bersih, serta sidebar bookmark & posisi belajar yang responsif.
5. **Detail Pelatihan Penuh (`/training-programs/[slug]`)**: Hero terintegrasi breadcrumbs dan wave divider, aside status eligibility transparan, serta daftar kurikulum course formal Moodle terstruktur.

---

## 2. File Perubahan

| Komponen / Halaman | File | Deskripsi Perubahan |
|---|---|---|
| Techwind Primitives | `apps/portal-web/src/components/techwind/index.tsx` | - `DetailHero` & `CourseDetailHero` mendukung `backgroundImage`, `breadcrumbs`, dan SVG wave divider.<br/>- `LearningPathStepCard` mengadopsi timeline vertikal, status circle avatar (centang selesai, ring aktif, gembok terkunci), dan badge milestone.<br/>- `MicrolearningDetailHero` mendukung `backgroundImage` dan `breadcrumbs`. |
| Jalur Belajar Detail | `apps/portal-web/src/app/learning-paths/[slug]/page.tsx` | Integrasi `DetailHero` dengan latar belakang `/techwind-hero/course/cta.jpg`, breadcrumbs terpadu, dan rendering roadmap timeline interaktif. |
| Kursus Pembelajar | `apps/portal-web/src/components/learning/course-list.tsx` | Menambahkan filter tab status (`Semua`, `Sedang Berjalan`, `Selesai`), tata letak kartu kursus yang rapi, dan tombol akses cepat. |
| Dashboard Pembelajar | `apps/portal-web/src/app/my-learning/page.tsx` | Modernisasi `LearningHero` dan styling kartu sertifikat (`CertificateCard`). |
| Detail Microlearning | `apps/portal-web/src/app/microlearning/[slug]/page.tsx` | Integrasi breadcrumbs & latar belakang gambar `/techwind-hero/blog.jpg` pada `MicrolearningDetailHero`. |
| Detail Pelatihan Penuh | `apps/portal-web/src/app/training-programs/[slug]/page.tsx` | Integrasi breadcrumbs & latar belakang gambar `/techwind-hero/course/cta.jpg` pada `CourseDetailHero`. |

---

## 3. Bukti Verifikasi Mutu

Seluruh uji otomatis dijalankan dan lulus 100%:
1. **TypeScript Typecheck**:
   `npm.cmd --prefix apps/portal-web run typecheck` → **PASS** (0 errors).
2. **ESLint (Flat Config)**:
   `npm.cmd --prefix apps/portal-web run lint` → **PASS** (0 warnings, 0 errors).
3. **UI Foundation Contract**:
   `node scripts/verify-ui-foundation-contract.mjs` → **PASS** (`UI foundation contract lulus untuk all.`).
4. **Domain Contract Checks**:
   - `node scripts/verify-learning-path-contract.mjs` → **PASS**
   - `node scripts/verify-microlearning-contract.mjs` → **PASS**
   - `node scripts/verify-training-program-contract.mjs` → **PASS**
   - `node scripts/verify-webinar-contract.mjs` → **PASS**
5. **Next.js Production Webpack Build**:
   `npm.cmd --prefix apps/portal-web run build -- --webpack` → **PASS** (32 rute Next.js terkompilasi sukses).
6. **Docker Local Environment Lifecycle**:
   - Container `teman-belajar-web:local` di-rebuild dan dijalankan ulang via `powershell.exe -ExecutionPolicy Bypass -File .\infrastructure\docker\teman-belajar-docker.ps1 up`.
   - Seluruh 8 endpoint (`web`, `admin`, `api`, `keycloak`, `moodle`, `minio`, `meilisearch`, `grafana`) **PASS HTTP 200** via `powershell.exe -ExecutionPolicy Bypass -File .\infrastructure\docker\teman-belajar-docker.ps1 verify`.
   - curl pengujian halaman dalam mengembalikan status HTTP 200.
