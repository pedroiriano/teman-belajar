# Panduan Pengujian Penerimaan Pengguna & Verifikasi Peramban (UAT / Manual Testing)
## Teman Belajar — LXP + Moodle LMS Enterprise Platform (Tahap 1 s.d. Tahap 4)

Dokumen ini merupakan panduan resmi pengujian penerimaan pengguna (*User Acceptance Testing* / UAT) dan verifikasi peramban manual (*browser verification*) untuk seluruh ekosistem **Teman Belajar** pasca-ekspansi Tahap 1 hingga Tahap 4.

---

## 1. Lingkungan & URL Akses Sistem

| Layanan | Peran / Domain | URL Peramban | Catatan Akses |
| :--- | :--- | :--- | :--- |
| **Portal Web** | Pengalaman Pembelajar (*Learner*) | `http://localhost:3000` | UI Techwind Tailwind CSS |
| **Admin Web** | Ruang Kerja Admin (*Backoffice*) | `http://localhost:3001` | UI Cuba Tailwind (Bright Sky/Light-Blue) |
| **Keycloak SSO** | Sentral Identitas & OIDC | `http://keycloak.teman-belajar.localhost:8081` | Realm: `teman-belajar` |
| **Moodle LMS** | Manajemen Pembelajaran Formal | `http://localhost:8082` | Integrasi `local_temanbelajar` |
| **Portal API** | REST API Backend Monolit | `http://127.0.0.1:8080/api/v1/health` | Health probe HTTP 200 |
| **MinIO Console** | Manajemen Objek Media | `http://localhost:19001` | S3 Storage Media & Asset |
| **Grafana** | Observabilitas & Metrik | `http://localhost:3002` | Metrik Prometheus & Tracing |

---

## 2. Kredensial Akun Pengujian (Test Fixtures)

Gunakan akun seed resmi lokal berikut untuk menguji otentikasi SSO Keycloak dan autorisasi peran (*RBAC*):

### A. Akun Administrator Platform
- **Username / Email**: `admin@temanbelajar.local`
- **Kata Sandi**: `secret123456_SEED_ADMIN_PASSWORD`
- **Peran Realm Keycloak**: `Portal Administrator`
- **Hak Akses**: Akses penuh ke seluruh menu Admin Web (`/dashboard/*`).

### B. Akun Pembelajar (Learner)
- **Username / Email**: `learner@temanbelajar.local`
- **Kata Sandi**: `secret123456_SEED_LEARNER_PASSWORD`
- **Peran Realm Keycloak**: `Learner`
- **Hak Akses**: Akses penuh ke Portal Web (`/my-learning`, `/catalog`, `/learning-paths`, `/knowledge`, `/help`). Akses ke Admin Web akan otomatis ditolak (*Forbidden 403 / Redirect*).

---

## 3. Matriks Skenario Pengujian UAT (Test Cases)

### Skenario 1: Verifikasi Pengalaman Pembelajar (Learner Experience)
**Tujuan**: Memastikan katalog taksonomi, pelacakan progres belajar mandiri, dan integrasi rating berfungsi optimal.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 1.1 | Buka `http://localhost:3000/catalog` pada peramban. | Halaman Katalog terbuka, memuat kartu kursus dan modul pembelajaran dengan tata letak Techwind responsif. | [ ] |
| 1.2 | Uji filter taksonomi pada sidebar kiri (pilih Kategori, Tingkat Kesulitan *Pemula*, atau Tag tertentu). | Daftar kartu menyaring konten secara dinamis. Muncul badge filter aktif di atas kartu yang dapat di-klik tanda silang (*dismissible*) untuk reset filter. | [ ] |
| 1.3 | Klik tombol **"Masuk"** di sudut kanan atas navbar. Masukkan kredensial `learner@temanbelajar.local`. | Dialihkan ke Keycloak SSO, berhasil login, dan kembali ke Portal Web dengan profil pembelajar aktif. | [ ] |
| 1.4 | Navigasi ke menu **"Pembelajaran Saya"** (`/my-learning`). | Dasbor pembelajar menampilkan ringkasan jam belajar (`estimatedHours`), kursus aktif Moodle, daftar microlearning, dan jalur belajar yang sedang ditempuh. | [ ] |
| 1.5 | Buka salah satu konten Microlearning (`/microlearning/[slug]`), lalu berikan penilaian rating bintang (1–5 bintang) dan klik tombol Simpan/Bookmark. | Indikator bintang terisi interaktif, skor rating ter-update, dan materi tersimpan pada tab bookmark di `/my-learning`. | [ ] |
| 1.6 | Akses halaman **Webinar** (`/webinars`). | Menampilkan status aman *fail-closed*: **"Webinar masih dalam persiapan"** sesuai mandat gerbang keamanan `TASK-015`. Tidak ada tombol pendaftaran aktif. | [ ] |

---

### Skenario 2: Mesin Jadwal Publikasi Persisten (Tahap 1)
**Tujuan**: Memverifikasi pembuatan, pembatalan, dan penerbitan instan jadwal publikasi pada PostgreSQL.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 2.1 | Buka `http://localhost:3001` dan login dengan akun `admin@temanbelajar.local`. | Masuk ke Dasbor Admin Cuba dengan palet resmi *Sky/Light-Blue* (tanpa warna oranye). | [ ] |
| 2.2 | Buka menu sidebar **"Jadwal Penerbitan"** (`/dashboard/schedule`). | Menampilkan tabel jadwal publikasi persisten dari tabel database `publication_schedules`. | [ ] |
| 2.3 | Perhatikan zona waktu yang tertera pada setiap baris jadwal. | Waktu diformat rapi dengan stempel zona waktu lokal Indonesia (WIB / Asia/Jakarta). | [ ] |
| 2.4 | Klik tombol aksi **"Terbitkan Sekarang"** (*Publish Now*) pada salah satu jadwal draf yang tersedia. | Muncul notifikasi konfirmasi sukses, status jadwal berubah menjadi diterbitkan, dan event audit `SCHEDULE_PUBLISHED_NOW` tercatat. | [ ] |

---

### Skenario 3: Riwayat Revisi & Visual Diff Viewer (Tahap 2)
**Tujuan**: Memverifikasi pelacakan revisi konten Berita & Pengumuman serta antarmuka pembanding visual *side-by-side*.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 3.1 | Buka menu **"Berita"** (`/dashboard/news`) atau **"Pengumuman"** (`/dashboard/announcements`). | Menampilkan daftar artikel konten lengkap dengan status editorialnya. | [ ] |
| 3.2 | Buka salah satu berita/pengumuman yang memiliki beberapa riwayat edit, lalu buka tab **"Riwayat Revisi"**. | Menampilkan daftar kronologis versi revisi lengkap dengan nomor versi, penulis, dan stempel waktu. | [ ] |
| 3.3 | Pilih dua versi yang berbeda untuk dibandingkan, lalu klik tombol **"Bandingkan Versi"** (*Visual Diff Viewer*). | Tampil modal pembanding *side-by-side* yang menyorot perbedaan teks judul, ringkasan, dan isi body secara jelas. | [ ] |
| 3.4 | Klik tombol **"Kembalikan ke Versi Ini"** (*Rollback*) jika ingin memulihkan versi lama. | Konten formulir otomatis terisi ulang dengan data dari versi revisi terpilih. | [ ] |

---

### Skenario 4: Operasi Editorial Massal / Batch Actions (Tahap 2)
**Tujuan**: Memverifikasi efisiensi pengubahan status massal melalui API transaksional `POST /api/v1/admin/batch-transitions`.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 4.1 | Buka tabel **Berita**, **Pengumuman**, atau **Pengetahuan**. | Setiap baris tabel dilengkapi checkbox pilihan di kolom paling kiri. | [ ] |
| 4.2 | Centang 2 atau lebih baris konten. | Di bagian bawah layar muncul melayang bilah aksi massal (*Cuba Bulk Action Bar*) yang mengindikasikan jumlah item terpilih. | [ ] |
| 4.3 | Pilih salah satu aksi transisi massal: **"Setujui"** (*Approve*), **"Terbitkan"** (*Publish*), atau **"Arsipkan"** (*Archive*). | Sistem memproses transaksi batch secara atomik, tabel me-refresh status secara instan, dan muncul pesan sukses. | [ ] |

---

### Skenario 5: Antrean Peninjauan & Umpan Balik Terpadu (Tahap 3)
**Tujuan**: Memastikan kolaborasi editorial antara Reviewer dan Penulis berjalan dengan validasi catatan wajib.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 5.1 | Buka menu **"Antrean Peninjauan"** (`/dashboard/review-queue`). | Menampilkan antrean konten dari berbagai modul yang berstatus *In Review* / Menunggu Peninjauan. | [ ] |
| 5.2 | Buka salah satu item antrean, lalu pilih aksi **"Minta Revisi"** atau **"Tolak"**. Kosongkan catatan atau ketik kurang dari 5 karakter. | Sistem memblokir aksi dan menampilkan pesan validasi: catatan peninjau (*review notes*) wajib diisi minimal 5 karakter. | [ ] |
| 5.3 | Ketik catatan peninjau yang konstruktif (misal: `"Mohon lengkapi bagian referensi dan gambar pendukung pada bab 2."`), lalu kirim. | Transisi berhasil, catatan tersimpan di tabel `review_notes` dan terhubung (*feedback threading*) langsung pada form draf penulis. | [ ] |

---

### Skenario 6: Manajemen Webinar & Sesi Live Learning (Tahap 4)
**Tujuan**: Memverifikasi antarmuka manajemen webinar, modal jadwal sesi baru, dan riwayat presensi peserta.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 6.1 | Buka menu **"Webinar"** (`/dashboard/webinars`). | Menampilkan ruang kerja webinar Cuba Admin lengkap dengan filter status (*Mendatang*, *Berlangsung*, *Selesai*). | [ ] |
| 6.2 | Klik tombol **"Jadwalkan Webinar Baru"**. | Terbuka modal formulir lengkap dengan field judul, nama narasumber, waktu mulai & selesai, kuota kursi, dan tautan streaming. | [ ] |
| 6.3 | Uji validasi waktu: set waktu selesai lebih awal daripada waktu mulai. | Form mencegah pengiriman dan menandai error validasi kronologis. | [ ] |
| 6.4 | Isi data valid dan simpan jadwal. | Sesi webinar baru muncul di tabel dengan badge status dan rincian kuota. | [ ] |
| 6.5 | Klik baris webinar untuk membuka modal detail teknis. | Menampilkan tab integrasi Moodle `mod_zoom` dan tab presensi peserta (*attendance provenance*). | [ ] |

---

### Skenario 7: Persistensi Kurasi Rekomendasi 2.0 (Tahap 4)
**Tujuan**: Memverifikasi penambahan sematan rekomendasi editorial persisten dengan target `learning_path`.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 7.1 | Buka menu **"Kurasi Rekomendasi"** (`/dashboard/recommendations`). | Menampilkan antarmuka penyematan rekomendasi berbobot prioritas (*recommendation pins*). | [ ] |
| 7.2 | Klik tombol **"Sematkan Rekomendasi Baru"**. | Terbuka modal pemilihan tipe konten: mendukung `"knowledge"`, `"microlearning"`, `"course"`, `"news"`, dan tipe baru `"learning_path"`. | [ ] |
| 7.3 | Pilih entitas Jalur Belajar (*Learning Path*), atur bobot prioritas (1–10), dan simpan. | Pin rekomendasi berhasil disimpan ke database PostgreSQL (`editorial_recommendation_pins`) dan muncul di tabel kurasi aktif. | [ ] |

---

### Skenario 8: Pusat Audit Terpadu & Filter Cepat Modul (Tahap 4)
**Tujuan**: Memverifikasi kelengkapan rekaman jejak audit terstruktur dan kemudahan filter berbasis chip modul.

| Langkah | Aksi Pengujian | Hasil yang Diharapkan | Status |
| :---: | :--- | :--- | :---: |
| 8.1 | Buka menu **"Log Audit"** (`/dashboard/audit`). | Menampilkan tabel rekaman audit terstruktur (`CubaAuditTable`) dari `audit.Repository`. | [ ] |
| 8.2 | Perhatikan bilah filter cepat berbasis chip di atas tabel. | Terdapat chip filter modul: **Semua**, **Rekomendasi**, **Webinar**, **Batch**, **Konfigurasi**, **Media**, **Pengetahuan**, dan **Audit**. | [ ] |
| 8.3 | Klik chip **"Rekomendasi"**. | Tabel seketika memfilter aksi audit terkait pin rekomendasi (`RECOMMENDATION_PIN_CREATED`, `RECOMMENDATION_PIN_DELETED`). | [ ] |
| 8.4 | Klik chip **"Webinar"**. | Tabel seketika memfilter aksi audit pendaftaran dan presensi webinar (`WEBINAR_REGISTERED`, dll.). | [ ] |
| 8.5 | Buka menu **"Konfigurasi Platform"** (`/dashboard/platform-configuration`). | Modul non-secret (`media_gallery`, `news`, `announcements`, `search`) tersinkronisasi aman tanpa mengekspos rahasia atau rute webinar aktif. | [ ] |

---

## 4. Ringkasan Hasil Pengujian Otomatis Pra-UAT

Sebelum pengujian manual peramban dijalankan, seluruh gerbang pengujian otomatis telah dieksekusi dengan hasil:

```text
1. End-to-End HTTP Probe (43 Routes)       : PASS (43/43 HTTP 200 OK - 100%)
2. Platform Specifications & Contracts (14) : PASS (14/14 Contract Suites - 100%)
3. Admin Web Contract Suites (15)          : PASS (15/15 Feature Suites - 100%)
4. Portal Web Contract Suites (3)           : PASS (3/3 Feature Suites - 100%)
5. Cuba Admin Visual Theme Guard            : PASS (Bright Sky/Light-Blue, 0 Orange/Amber)
6. Techwind Portal Foundation Guard         : PASS (Online Course Reference Baseline)
7. AI Agent Governance Alignment            : PASS (Exit Code 0)
8. Docker Compose 19 Services               : PASS (8/8 Verified Endpoints HTTP 200)
```
