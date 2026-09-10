# Release Notes — Teman Belajar Ekspansi Tahap 1 s.d. Tahap 4

**Tanggal Rilis:** 10 September 2026  
**Versi Baseline:** Post-TASK-012 / Post-TASK-024 Expansion Baseline  
**Status Integrasi:** MERGED to `main` (Commit `4210682`)  
**Status Produksi:** PRODUCTION HOLD (Keputusan Rilis Tetap Milik Manusia Sesuai TASK-012)

---

## 1. Ikhtisar Rilis

Rilis ini menyelesaikan seluruh rangkaian ekspansi platform pembelajaran terpadu **Teman Belajar** dari **Tahap 1 hingga Tahap 4**. Pembaruan ini mentransformasi ruang kerja administratif (**Admin Web**) dan portal pengalaman pembelajar (**Portal Web**) dari prototipe berbasis memori menjadi sistem terintegrasi penuh yang persisten, aman, terstandardisasi, dan siap audit dengan database PostgreSQL.

Seluruh pengembangan mematuhi konstitusi arsitektur [`AGENTS.md`](file:///c:/Datas/Proyek/Aplikasi/teman-belajar/AGENTS.md), batas isolasi identitas Keycloak (Rule 2A: *FINAL*), standar UI resmi Cuba Admin (Rule 4A: *Sky/Light-Blue, 100% bebas oranye/amber*), serta prinsip keamanan *fail-closed* untuk modul Webinar eksternal (`TASK-015`).

---

## 2. Fitur Baru & Peningkatan Utama

### A. Pengalaman Pembelajar (Learner Experience / Portal Web)
1. **Dasbor Pembelajaran Mandiri Terpadu (`/my-learning`)**:
   - Pelacakan progres komprehensif: Kursus Formal Moodle, Pembelajaran Singkat (*Microlearning*), Jalur Belajar (*Learning Paths*), dan Estimasi Jam Belajar (`estimatedHours`).
   - Navigasi cepat *dual-track* dengan filter materi aktif, bookmark tersimpan, dan sertifikat kelulusan.
2. **Katalog Terpadu Berbasis Taksonomi (`/catalog`)**:
   - Filter dinamis berdasarkan Kategori, Tag, Tingkat Kesulitan (*Pemula*, *Menengah*, *Mahir*), dan Urutan (*Terbaru*, *Terpopuler*).
   - *Active filter badges* yang interaktif dan dapat dihapus langsung (*dismissible*).
3. **Navigasi Jalur Belajar Terarah (`/learning-paths` & `/learning-paths/[slug]`)**:
   - Spanduk *Next Step Callout* yang memandu pembelajar ke materi berikutnya dalam alur kurikulum.
   - Kartu kelulusan dan penautan silabus otomatis ke kursus Moodle, modul microlearning, atau artikel pengetahuan.
4. **Rating Universal & Bookmark**:
   - Komponen rating 1–5 bintang interaktif pada Microlearning yang terhubung ke BFF dan backend API berprovenance.

---

### B. Ruang Kerja Administratif (Admin Backoffice / Admin Web)
1. **Mesin Penerbitan Terjadwal Persisten (`/dashboard/schedule`)**:
   - Tabel database `publication_schedules` di PostgreSQL dengan penanganan multi-zona waktu (WIB / Asia/Jakarta).
   - Deteksi otomatis kandidat jadwal kedaluwarsa dan aksi instan **"Terbitkan Sekarang"** (*Publish Now*).
   - Log audit otomatis (`SCHEDULE_PUBLISHED_NOW`, `SCHEDULE_CREATED`, `SCHEDULE_CANCELLED`).
2. **Standardisasi Riwayat Revisi & Visual Diff Viewer (CMS Berita & Pengumuman)**:
   - Skema persisten `news_revisions` dan `announcement_revisions` di PostgreSQL.
   - Endpoint API rollback dan antarmuka *side-by-side visual diff viewer* di Cuba Admin untuk membandingkan perbedaan judul, ringkasan, dan isi konten lintas revisi.
3. **Operasi Editorial Massal (Batch & Bulk Actions)**:
   - Endpoint transaksional `POST /api/v1/admin/batch-transitions` untuk memproses persetujuan (*approve*), penolakan (*reject*), pengarsipan (*archive*), dan penerbitan massal dalam satu transaksi atomik.
   - Komponen antarmuka Cuba Bulk Action Bar pada tabel Berita, Pengumuman, dan Pengetahuan dengan auto-refresh instan.
4. **Antrean Peninjauan & Umpan Balik Terpadu (`/dashboard/review-queue`)**:
   - Sistem percakapan umpan balik (*editorial feedback threading*) antara peninjau (*Reviewer*) dan penulis (*Editor*).
   - Validasi ketat: catatan peninjau (*review notes*) wajib diisi minimal 5 karakter saat meminta revisi atau menolak draf.
   - Sinkronisasi kontrak OpenAPI 3.1.0 untuk entitas `review_notes`.
5. **Ruang Kerja Manajemen Webinar & Live Learning (`/dashboard/webinars`)**:
   - Formulir dan modal penjadwalan sesi webinar baru dengan validasi judul, narasumber, validasi waktu mulai < selesai, kuota kursi, dan tautan streaming.
   - Modal detail webinar teknis dengan tab integrasi `mod_zoom` serta riwayat presensi peserta (*attendance provenance*).
   - **Prinsip Keamanan Fail-Closed**: Menu publik Webinar tetap dalam status `comingSoon` sampai kredensial Zoom Server-to-Server OAuth disetujui pengguna manusia (`TASK-015`).
6. **Persistensi & Kurasi Editorial Rekomendasi 2.0 (`/dashboard/recommendations`)**:
   - Antarmuka kurasi penyematan rekomendasi utama (*editorial pinning*) dengan bobot prioritas.
   - Dukungan tipe target baru `"learning_path"` melengkapi `"knowledge"`, `"microlearning"`, `"course"`, dan `"news"`.
   - Persistensi PostgreSQL pada tabel `editorial_recommendation_pins` yang terhubung langsung ke feed rekomendasi pengguna.
7. **Tata Kelola Platform Lanjutan & Jejak Audit Terpadu (`/dashboard/audit`)**:
   - Pencatatan audit otomatis untuk mutasi rekomendasi pin (`RECOMMENDATION_PIN_CREATED`, `RECOMMENDATION_PIN_DELETED`) dan aktivitas webinar (`WEBINAR_REGISTERED`, `WEBINAR_CANCELLED`, `WEBINAR_DETAIL_VIEWED`).
   - Filter cepat berbasis modul (*chips*: *Semua*, *Rekomendasi*, *Webinar*, *Batch*, *Konfigurasi*, *Media*, *Pengetahuan*, *Audit*) pada `CubaAuditTable`.
   - Sinkronisasi modul non-secret (`media_gallery`, `news`, `announcements`, `search`) pada Konfigurasi Platform (`/dashboard/platform-configuration`).

---

## 3. Matriks Kepatuhan Tata Kelola & Arsitektur

| Aturan Konstitusi | Status Kepatuhan | Keterangan |
| :--- | :---: | :--- |
| **Rule 0: Identitas Produk** | **100% PATUH** | Penamaan kanonis `Teman Belajar`, service `teman-belajar-*`, dan realm `teman-belajar` terjaga tanpa singkatan/terjemahan. |
| **Rule 2: Moodle Core Isolation** | **100% PATUH** | Tidak ada query langsung ke database Moodle; integrasi kursus dan webinar hanya melalui adapter resmi Moodle Web Service dan plugin `local_temanbelajar`. |
| **Rule 2A: Batas Inti Identitas** | **100% PATUH** | Keycloak, SSO OIDC, role mapping, dan account management tetap berstatus **FINAL dan TIDAK DIMODIFIKASI**. |
| **Rule 3A: Docker Local Env** | **100% PATUH** | 19 kontainer berjalan stabil dan lolos verifikasi melalui `teman-belajar-docker.ps1 verify` (PASS 8/8 HTTP 200). |
| **Rule 4A: Visual Contract Cuba Admin** | **100% PATUH** | Palet resmi bright sky/light-blue; 0 penggunaan warna oranye/amber (`npm run test:no-orange` PASS). |
| **Rule 4A: Visual Contract Techwind Portal** | **100% PATUH** | Mematuhi baseline `html/index-course.html` (`npm run test:vendor-foundation` PASS). |
| **Rule 5: Frontend Runtime** | **100% PATUH** | Next.js 16.3.0, React 19.2.8, Node 22, async request APIs, ESLint flat config (0 warning, 0 error). |
| **Rule 7: Kontrak API** | **100% PATUH** | OpenAPI 3.1.0 (`openapi/openapi.yaml`) lolos validasi Redocly CLI dengan 0 error. |

---

## 4. Bukti Pengujian (*Verification Evidence*)

- **Gate Keamanan Webinar**: `node scripts/verify-webinar-contract.mjs` ➔ **PASS**
- **Validasi OpenAPI Spec**: `npx @redocly/cli lint openapi/openapi.yaml` ➔ **PASS** (0 errors)
- **Go Unit Tests Backend**: `go test ./...` pada `services/portal-api` ➔ **PASS** (100% unit tests lolos)
- **Admin Web Guards**:
  - `npm run typecheck` ➔ **PASS (0 error)**
  - `npm run test:no-orange` ➔ **PASS**
  - `npm run test:vendor-foundation` ➔ **PASS**
  - `npm run lint` ➔ **PASS (0 warning, 0 error)**
- **Portal Web Guards**:
  - `npm run typecheck` ➔ **PASS (0 error)**
  - `npm run test:vendor-foundation` ➔ **PASS**
  - `npm run lint` ➔ **PASS (0 warning, 0 error)**
- **Kepatuhan Tata Kelola Agen**: `scripts/verify-agent-governance.ps1` ➔ **PASS**
- **Docker Compose Health**: `infrastructure/docker/teman-belajar-docker.ps1 verify` ➔ **PASS 8/8 HTTP 200**

---

## 5. Prosedur Rollback

Jika ditemukan regresi fungsional setelah penerapan rilis ini di lingkungan pengujian:
1. Kembalikan merge commit `4210682` pada branch `main`:
   ```bash
   git revert -m 1 4210682
   git push origin main
   ```
2. Bangun ulang container menggunakan script resmi:
   ```powershell
   powershell -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 up
   ```
3. Tidak ada migrasi database yang bersifat destruktif; skema database bersifat *forward-only* dan kompatibel ke belakang.
