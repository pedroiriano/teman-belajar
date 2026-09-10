# Engineering Handoff — Tahap 1 s.d. Tahap 4 Full Expansion Closure

## 1. Executive Summary

Dokumen ini mendokumentasikan penyerahan teknis (*engineering handoff*) dari penyelesaian seluruh ruang lingkup **Tahap 1, Tahap 2, Tahap 3, dan Tahap 4** pada repositori `teman-belajar`. Rilis ini mengonsolidasikan seluruh kapabilitas sistem manajemen pembelajaran enterprise (LXP + Moodle LMS) pasca TASK-012 dan TASK-024.

- **Baseline Merge Commit**: `4210682` pada branch `main`
- **Autoritas Arsitektur**: [`AGENTS.md`](file:///c:/Datas/Proyek/Aplikasi/teman-belajar/AGENTS.md)
- **Status Produksi**: `PRODUCTION HOLD` (Keputusan Manusia Independen sesuai `TASK-012`)

---

## 2. Rincian Pekerjaan Per Tahap

### Tahap 1: Persistensi Data & Fondasi Otomasi
- **Jadwal Publikasi Persisten (`publication_schedules`)**:
  - Migrasi skema database PostgreSQL untuk menyimpan jadwal penerbitan entitas CMS (`news`, `announcements`, `knowledge_articles`).
  - Handler backend dan endpoints `GET /api/v1/admin/schedules`, `POST /api/v1/admin/schedules`, `POST /api/v1/admin/schedules/{id}/cancel`, `POST /api/v1/admin/schedules/{id}/publish-now`, dan `GET /api/v1/admin/schedules/candidates`.
  - Integrasi server actions `apps/admin-web/src/app/actions/schedule.ts` langsung ke API PostgreSQL.
- **Persistensi Matriks Hak Akses Aplikasi (RBAC)**:
  - Skema database tabel `role_policies` dan endpoints CRUD `/api/v1/admin/rbac/roles`.
  - Sinkronisasi `policy-store.ts` di Admin Web dengan backend API persisten tanpa menyentuh Keycloak (`AGENTS.md` Rule 2A).
- **Persistensi Catatan Peninjauan Editorial (`review_notes`)**:
  - Skema database tabel `review_notes` dan service domain `reviewnote.Service`.
  - Endpoint `POST /api/v1/admin/review-notes` dan `GET /api/v1/admin/review-notes/{entityType}/{entityId}`.

### Tahap 2: Standardisasi Riwayat Revisi & Batch Transaction
- **Riwayat Revisi CMS Berita & Pengumuman**:
  - Skema tabel `news_revisions` dan `announcement_revisions` di PostgreSQL.
  - Endpoint `GET /api/v1/admin/news/{id}/revisions`, `POST /api/v1/admin/news/{id}/rollback`, `GET /api/v1/admin/announcements/{id}/revisions`, `POST /api/v1/admin/announcements/{id}/rollback`.
  - Komponen antarmuka *Visual Diff Viewer* side-by-side di Cuba Admin (`cuba-diff-viewer.tsx`).
- **Batch & Bulk Actions API**:
  - Endpoint atomik `POST /api/v1/admin/batch-transitions` yang mendukung transisi status massal (`approve`, `reject`, `archive`, `publish`) pada entitas konten.
  - Komponen `CubaBulkActionBar` pada tabel Berita, Pengumuman, dan Pengetahuan di Web Admin.

### Tahap 3: Umpan Balik Editorial Terpadu & Validasi Ketat
- **Review Queue Feedback Threading**:
  - Peninjau (*Reviewer*) wajib menyertakan catatan minimal 5 karakter saat meminta revisi atau menolak draf.
  - Catatan revisi langsung terhubung ke form draf penulis (*Editor*) beserta provenance reviewer dan stempel waktu.
  - Sinkronisasi kontrak OpenAPI 3.1.0 untuk `review_notes`.

### Tahap 4: Integrasi Webinar, Rekomendasi 2.0 & Tata Kelola Lanjutan
- **Ruang Kerja Webinar Admin (`/dashboard/webinars`)**:
  - Pendaftaran rute backend `webinarHandler` di `main.go`.
  - Ruang kerja Cuba Admin dengan form penjadwalan, filter dinamis, dan modal detail presensi peserta (*attendance provenance*).
  - Penegakan gerbang keamanan fail-closed `TASK-015` (`scripts/verify-webinar-contract.mjs` PASS).
- **Persistensi & Kurasi Editorial Rekomendasi 2.0 (`/dashboard/recommendations`)**:
  - Rute backend pin kurasi editorial terdaftar bersih dengan dukungan tipe target `"learning_path"`.
  - Integrasi pin PostgreSQL (`editorial_recommendation_pins`) ke feed rekomendasi pengguna via `engagementService.SetPinProvider(...)`.
- **Tata Kelola Platform Lanjutan & Jejak Audit Terpadu (`/dashboard/audit`)**:
  - Structured audit logging untuk aktivitas webinar dan rekomendasi pin.
  - Sinkronisasi modul non-secret (`media_gallery`, `news`, `announcements`, `search`) di `model.go` dan `platform-configuration.ts`.
  - Filter cepat berbasis modul pada `CubaAuditTable` di Web Admin.
- **Release Readiness Gate**:
  - Seluruh guard tests (Redocly, Go test, Cuba no-orange, Techwind foundation, typecheck, lint, governance) lolos 100%.

---

## 3. Direktori File Kunci yang Diubah / Ditambahkan

| Komponen | File / Path | Peran |
| :--- | :--- | :--- |
| **Backend API** | `services/portal-api/cmd/api/main.go` | Pendaftaran router ServeMux untuk webinar, pin rekomendasi, jadwal, batch, revisi, dan audit. |
| **Backend Domain** | `services/portal-api/internal/domain/recommendationpin/` | Layanan domain kurasi pin rekomendasi editorial. |
| **Backend Domain** | `services/portal-api/internal/domain/webinar/` | Layanan domain sesi webinar dan sinkronisasi Moodle `mod_zoom`. |
| **Backend Domain** | `services/portal-api/internal/domain/platformconfig/` | Validasi dan konfigurasi dinamis platform non-secret. |
| **Backend Handler** | `services/portal-api/internal/transport/http/handler/` | Handler HTTP untuk webinar, rekomendasi pin, jadwal, batch, dan audit. |
| **Kontrak API** | `openapi/openapi.yaml` | Spesifikasi OpenAPI 3.1.0 terverifikasi. |
| **Admin Web** | `apps/admin-web/src/components/webinars/` | Komponen ruang kerja webinar Cuba Admin (`cuba-webinar-workspace.tsx`). |
| **Admin Web** | `apps/admin-web/src/components/recommendations/` | Komponen kurasi rekomendasi editorial (`cuba-recommendation-workspace.tsx`). |
| **Admin Web** | `apps/admin-web/src/components/audit/` | Komponen audit table dengan filter modul (`cuba-audit-table.tsx`). |
| **Admin Web** | `apps/admin-web/src/lib/platform-configuration.ts` | Tipe data dan konfigurasi default fitur platform. |

---

## 4. Bukti Verifikasi Lengkap

```powershell
# 1. Gate Kontrak Webinar & Fail-Closed
node scripts/verify-webinar-contract.mjs
# PASS webinar contract and activation gate

# 2. Validasi Kontrak OpenAPI
npx @redocly/cli lint openapi/openapi.yaml
# Woohoo! Your API description is valid. 0 errors.

# 3. Unit Tests Backend Go
cd services/portal-api; go test ./...
# PASS seluruh paket (0 error)

# 4. Guard UI Admin Web
cd apps/admin-web
npm run typecheck              # PASS (0 error)
npm run test:no-orange         # PASS (100% bebas oranye/amber)
npm run test:vendor-foundation  # PASS (Cuba contract)
npm run lint                   # PASS (0 warnings, 0 errors)

# 5. Guard UI Portal Web
cd apps/portal-web
npm run typecheck              # PASS (0 error)
npm run test:vendor-foundation  # PASS (Techwind contract)
npm run lint                   # PASS (0 warnings, 0 errors)

# 6. Kepatuhan Tata Kelola Agen
powershell -ExecutionPolicy Bypass -File scripts/verify-agent-governance.ps1
# AI agent governance verification PASS

# 7. Verifikasi Docker Runtime
powershell -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 verify
# PASS Portal API (8080): HTTP 200
# PASS Portal Web (3000): HTTP 200
# PASS Admin Web (3001): HTTP 200
# PASS Keycloak (8081): HTTP 200
# PASS Moodle (8082): HTTP 200
# PASS MinIO (19000): HTTP 200
# PASS Meilisearch (7700): HTTP 200
# PASS Grafana (3002): HTTP 200
```

---

## 5. Instruksi Pengembang Selanjutnya (Next Developer Notes)

1. **Batas Identitas Keycloak**: Jangan memodifikasi konfigurasi Keycloak, skrip impor realm, atau alur SSO OIDC (`AGENTS.md` Rule 2A).
2. **Kredensial Webinar Zoom**: Menu publik Webinar sengaja berstatus `comingSoon` (*fail-closed*). Pengaktifan publik hanya boleh dilakukan setelah kredensial Zoom Server-to-Server OAuth resmi dimasukkan ke environment dan disetujui manusia (`TASK-015`).
3. **Standar Desain Cuba**: Seluruh penambahan komponen UI di Admin Web wajib mematuhi palet *Sky/Light-Blue* dan dilarang menggunakan warna oranye/amber (`npm run test:no-orange`).
