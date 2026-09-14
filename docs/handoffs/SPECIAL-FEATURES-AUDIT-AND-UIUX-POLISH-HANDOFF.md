# Engineering Handoff — Fitur Khusus, Audit Kualitas, & Penyempurnaan UI/UX

## 1. Ringkasan Eksekutif (Executive Summary)

Dokumen ini mencatat penyerahan teknis (*engineering handoff*) atas penyempurnaan, perbaikan bug, audit proses bisnis, dan peningkatan pengalaman pengguna (UI/UX) pada platform **Teman Belajar** (LXP + Moodle LMS) yang diselesaikan pada tanggal 14 September 2026.

- **Repositori**: 	eman-belajar
- **Cabang**: main
- **Konstitusi Teknis**: [AGENTS.md](file:///c:/Datas/Proyek/Aplikasi/teman-belajar/AGENTS.md)
- **Status Produksi**: PRODUCTION HOLD (Sesuai ketetapan tata kelola gerbang manusia TASK-012)

---

## 2. Rincian Fitur & Penyempurnaan yang Dikerjakan

### A. Ulasan & Penilaian Program Pelatihan (*Course Reviews & Ratings*)
- **Migrasi Database (services/portal-api/migrations/029_create_course_reviews.sql)**:
  - Tabel course_reviews dengan atribut id, program_id, user_id, user_name, ating (1–5), comment, status (pending, pproved, ejected), created_at, updated_at.
  - Indeks performa: idx_course_reviews_program, idx_course_reviews_status, idx_course_reviews_user.
  - Kendala integritas data: Satu pengguna hanya dapat memberikan satu ulasan aktif per program (unique_user_program_review).
- **Backend Go Domain & Service**:
  - Domain coursereview (model.go, epository.go, service.go, service_test.go).
  - Implementasi PostgreSQL repository course_review_repository.go.
  - Handler HTTP course_review.go dan suite uji unit course_review_test.go.
  - Pendaftaran rute publik (GET /api/v1/training-programs/{slug}/reviews, POST /api/v1/training-programs/{slug}/reviews) dan rute admin terproteksi (GET /api/v1/admin/reviews, PATCH /api/v1/admin/reviews/{id}/status, DELETE /api/v1/admin/reviews/{id}).
  - Sinkronisasi kontrak OpenAPI pada openapi/openapi.yaml.
- **Antarmuka Web Publik (pps/portal-web)**:
  - Komponen CourseReviewsSection pada halaman detail program (/training-programs/[slug]).
  - Form submit interaktif dengan validasi skor bintang (1–5) dan komentar minimal 10 karakter.
  - Proxy BFF API route src/app/api/training-programs/[slug]/reviews/route.ts.
- **Antarmuka Backoffice Cuba Admin (pps/admin-web)**:
  - Halaman moderasi ulasan /dashboard/course-reviews.
  - Server actions src/app/actions/course-reviews.ts untuk persetujuan (*approve*), penolakan (*reject*), dan penghapusan ulasan dengan audit logging.

### B. Verifikasi Sertifikat Resmi (*Certificate Verification*)
- **Halaman Verifikasi Publik (/certificates/verify)**:
  - Form pencarian kode sertifikat resmi dengan sanitasi input server-side.
  - Tampilan visual status sertifikat terverifikasi (nama penerima, judul kursus/program, tanggal penerbitan, nomor sertifikat, status validitas).
  - Penanganan status sertifikat tidak ditemukan atau kedaluwarsa.
  - Helper pustaka src/lib/certificates.ts dan BFF route src/app/api/certificates/verify/route.ts.

### C. Transkrip Pembelajaran Terpadu (*Learner Academic Transcript*)
- **Halaman Profil Transkrip (/profile/transcript)**:
  - Rekapitulasi progres kursus resmi Moodle, nilai akhir (*grades*), status kelulusan, tanggal penyelesaian, dan kredit jam pembelajaran.
  - Fitur cetak/ekspor transkrip digital ramah cetak (*print-friendly stylesheet*).
  - Helper pustaka src/lib/transcript.ts dan BFF proxy src/app/api/learning/me/transcript/route.ts.
  - Integrasi backend learningService.GetTranscript(ctx, userID).

### D. Penyempurnaan Filter Interaktif In-Place (Katalog & Pelatihan)
- **Komponen CatalogExplorer (/catalog) & TrainingProgramsExplorer (/training-programs)**:
  - Seluruh tombol/tab/pills filter diubah dari tautan navigasi (<Link>) menjadi tombol aksi reaktif (<button type=button>).
  - Penyaringan data seketika (*in-memory*) tanpa reload browser, tanpa navigasi URL yang memicu re-fetch, dan tanpa membuat posisi halaman melompat ke atas.
  - Sinkronisasi URL address bar secara halus menggunakan window.history.replaceState untuk keperluan bookmark/share tautan.

### E. Sticky Accordion pada Section FAQ Web Publik
- **Komponen TechwindFaqSection (pps/portal-web/src/components/techwind-faq-section.tsx)**:
  - Grid container diatur dengan items-start untuk membuka ruang scroll vertikal independen antar kolom.
  - Kolom Accordion dan kolom visual CTA Image diberikan kelas utilitas self-start md:sticky md:top-24.
  - Pada resolusi desktop (md: ke atas), Accordion mengambang secara stabil (*sticky*) di bawah bilah navigasi utama (	op-24) saat halaman digulir.
  - Pada resolusi mobile, tata letak otomatis kembali menyusun ke bawah (*stacked*) secara responsif tanpa menghalangi layar.

---

## 3. Daftar Berkas yang Ditambahkan & Diperbarui

### Layanan Backend (services/portal-api)
- migrations/029_create_course_reviews.sql *(BARU)*
- internal/domain/coursereview/model.go *(BARU)*
- internal/domain/coursereview/repository.go *(BARU)*
- internal/domain/coursereview/service.go *(BARU)*
- internal/domain/coursereview/service_test.go *(BARU)*
- internal/repository/postgres/course_review_repository.go *(BARU)*
- internal/transport/http/handler/course_review.go *(BARU)*
- internal/transport/http/handler/course_review_test.go *(BARU)*
- internal/domain/learning/model.go
- internal/domain/learning/service.go
- internal/transport/http/handler/learning.go
- internal/transport/http/handler/learning_test.go
- cmd/api/main.go
- openapi/openapi.yaml

### Aplikasi Publik (pps/portal-web)
- src/components/catalog/catalog-explorer.tsx *(BARU)*
- src/components/training-programs/training-programs-explorer.tsx *(BARU)*
- src/components/training-programs/course-reviews-section.tsx *(BARU)*
- src/components/certificates/certificate-verify-view.tsx *(BARU)*
- src/components/learning/transcript-actions.tsx *(BARU)*
- src/app/catalog/page.tsx
- src/app/training-programs/page.tsx
- src/app/training-programs/[slug]/page.tsx
- src/app/certificates/verify/page.tsx *(BARU)*
- src/app/profile/transcript/page.tsx *(BARU)*
- src/app/api/training-programs/[slug]/reviews/route.ts *(BARU)*
- src/app/api/certificates/verify/route.ts *(BARU)*
- src/app/api/learning/me/transcript/route.ts *(BARU)*
- src/components/techwind-faq-section.tsx
- src/lib/certificates.ts *(BARU)*
- src/lib/transcript.ts *(BARU)*
- src/lib/training-programs.ts

### Aplikasi Admin Backoffice (pps/admin-web)
- src/app/dashboard/course-reviews/page.tsx *(BARU)*
- src/app/actions/course-reviews.ts *(BARU)*
- src/components/admin-shell.tsx
- src/lib/navigation.ts
- src/components/audit/cuba-audit-table.tsx

---

## 4. Bukti Pengujian & Verifikasi Kualitas (Quality Gates Evidence)

1. **TypeScript Typecheck**:
   - pps/portal-web: 	sc --noEmit -> PASS (0 errors).
   - pps/admin-web: 	sc --noEmit -> PASS (0 errors).
2. **ESLint Linting**:
   - pps/portal-web: eslint . --max-warnings=0 -> PASS (0 warnings).
   - pps/admin-web: eslint . --max-warnings=0 -> PASS (0 warnings).
3. **Backend Go Compilation & Unit Tests**:
   - services/portal-api: go test ./... -> PASS (100%).
4. **13 Skrip Kontrak Tata Kelola Repositori (scripts/verify-*.mjs)**:
   - Seluruh 13 pengujian kontrak lulus 100%.
5. **Docker Local Environment Execution**:
   - Kontainer 	eman-belajar-web-1 dan 	eman-belajar-api-1 berjalan sehat (*healthy*).
