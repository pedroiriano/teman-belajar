# 14. Spesifikasi Modul Manajemen Webinar Mandiri (LXP Native)

Dokumen ini mendefinisikan arsitektur, alur proses bisnis, model data, dan standar antarmuka bagi modul **Webinar & Sesi Belajar Langsung** pada platform Teman Belajar.

---

## 1. Prinsip Desain & Batasan Arsitektur

1. **Mandiri (LXP Native)**:
   - Webinar tidak lagi bergantung pada plugin Moodle (`mod_zoom`).
   - Seluruh siklus hidup webinar (jadwal, kuota, pendaftaran, presensi, dan rekaman) dikelola langsung oleh backend Go Teman Belajar (`services/portal-api`) dan tersimpan di database PostgreSQL.
2. **Dukungan Platform Universal (Vendor-Agnostic)**:
   - Pengelola bebas menggunakan platform telekonferensi apa pun:
     - **Zoom Meeting (Gratis / Basic)**: Durasi 40 menit, kapasitas 100 kursi.
     - **Zoom Meeting / Webinar (Berbayar)**: Kapasitas 300–1000 kursi.
     - **Google Meet**: Tautan pertemuan Google Workspace / pribadi.
     - **Microsoft Teams**: Undangan pertemuan rapat online.
     - **Platform Terbuka / Lainnya**: BigBlueButton, Jitsi, YouTube Live.
3. **Keamanan Tautan Pertemuan**:
   - Tautan ruang pertemuan (`join_url`) hanya disajikan kepada peserta yang telah resmi terdaftar. Pengguna umum/tamu yang belum terdaftar tidak mendapatkan tautan ini (*server-side masking*).
4. **Kepatuhan Desain Sistem Baku**:
   - **Admin Web**: Wajib mengikuti fondasi Cuba Admin Dashboard: palet sky/light-blue (`#0284c7`, `#38bdf8`), 0% oranye/amber (`Rule 4A.12`), `AdminDataTable`, modal `createPortal(..., document.body)` `z-[100]`, dan form footer `#form-error-alert` dengan auto-scroll.
   - **Portal Web (Publik)**: Wajib mengikuti fondasi Techwind Course (`index-course.html`, `Rule 4A.14`), kartu responsif, tab filter status, dan modal konfirmasi `createPortal` `z-[100]`.

---

## 2. Model Basis Data (PostgreSQL)

### A. Tabel `webinars`
- `id`: Serial Primary Key.
- `title`, `slug`: Judul dan pengenal unik URL.
- `summary`, `description`: Ringkasan dan silabus lengkap sesi.
- `speaker`: Nama narasumber dan gelar.
- `starts_at`, `ends_at`: Waktu mulai dan selesai (dengan constraint `starts_at < ends_at`).
- `timezone`: Zona waktu (default `'Asia/Jakarta'`).
- `capacity`: Kapasitas maksimum kursi (constraint `capacity >= 1`).
- `registered_count`: Jumlah pendaftar aktif (auto-recalculated).
- `status`: Status sesi (`upcoming`, `live`, `completed`, `cancelled`).
- `join_url`: Tautan ruang telekonferensi untuk host dan peserta terdaftar.
- `recording_url`: Tautan rekaman sesi pasca-webinar.
- `provider`: Jenis platform (`zoom`, `gmeet`, `teams`, `bigbluebutton`, `other`).
- `created_at`, `updated_at`: Timestamp audit.

### B. Tabel `webinar_registrations`
- `id`: UUID Primary Key.
- `webinar_id`: Foreign Key ke `webinars(id)` `ON DELETE CASCADE`.
- `user_id`: Subject identitas terverifikasi Keycloak.
- `user_name`, `user_email`: Identitas nama dan email peserta.
- `status`: Status kehadiran (`registered`, `attended`, `cancelled`).
- `registered_at`, `updated_at`: Timestamp pendaftaran dan perubahan status.
- Constraint unik: `(webinar_id, user_id)`.

---

## 3. Alur Proses Bisnis

### A. Alur Pengelola (Web Admin)
1. **Penjadwalan Sesi Baru**:
   - Masuk ke `/dashboard/webinars` -> Klik **"+ Jadwalkan Webinar Baru"**.
   - Pilih platform telekonferensi, tentukan kapasitas kursi, jam mulai/selesai, narasumber, dan tautan pertemuan.
   - Tersimpan langsung ke PostgreSQL via `POST /api/v1/admin/webinars`.
2. **Kontrol Sesi Berlangsung (Live)**:
   - Admin dapat membuka tautan ruang rapat host melalui tombol aksi cepat **"Buka Ruang Sesi (Host)"**.
   - Admin mengubah status sesi menjadi `live` saat acara dimulai.
3. **Pencatatan Presensi Kehadiran**:
   - Di tab **Kehadiran Peserta**, admin melihat metrik ringkasan (Total Terdaftar, Hadir, Belum Hadir, Persentase Kehadiran).
   - Admin menandai presensi peserta dengan tombol **"Tandai Hadir"** / **"Set Belum Hadir"** (`POST /api/v1/admin/webinars/{id}/attendance`).
4. **Pascasesi & Rekaman**:
   - Setelah sesi selesai, ubah status menjadi `completed` dan input tautan rekaman sesi (`recording_url`).

### B. Alur Peserta (Web Publik / Learner)
1. **Eksplorasi Katalog (`/webinars`)**:
   - Peserta meninjau daftar webinar dengan filter tab: *Semua*, *Akan Datang*, *Sedang Berlangsung*, *Selesai & Rekaman*.
   - Setiap kartu menampilkan status, platform pertemuan, narasumber, dan sisa kuota kursi.
2. **Detail & Pendaftaran (`/webinars/[id]`)**:
   - Peserta membaca silabus dan panduan sesi.
   - Peserta menekan tombol **"Daftar Sesi Webinar (Gratis)"** -> Konfirmasi modal pop-up -> Terdaftar langsung di database.
3. **Mengikuti Sesi Live**:
   - Saat sesi berstatus `live`, tombol aksi utama berubah menjadi **"Masuk Ruang Pertemuan (Buka Zoom / GMeet)"** yang membuka tautan meeting secara instan.
4. **Akses Rekaman**:
   - Jika sesi telah selesai dan penyelenggara menyediakan tautan rekaman, peserta dapat menekan tombol **"Tonton Rekaman Sesi"**.
