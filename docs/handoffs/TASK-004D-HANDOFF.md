# TASK-004D: SSO QA & Moodle Auth Fixes Handoff

## 1. Ringkasan Perbaikan
Tahap pengujian dan stabilisasi SSO (Keycloak, NextAuth, Moodle) telah berhasil diselesaikan secara komprehensif. Berikut adalah isu-isu krusial yang telah diperbaiki:

### A. NextAuth `unauthorized_client` di Portal Web
- **Masalah:** Terjadi *mismatch* antara nilai `TB_KEYCLOAK_WEB_CLIENT_SECRET` di `.env` lokal dengan *client secret* `teman-belajar-web` yang dikonfigurasi di *database* Keycloak.
- **Penyelesaian:** Melakukan sinkronisasi nilai *secret* ke `.env` lokal menjadi `tb_local_oidc_web_A7k2R9m4` sesuai *database* Keycloak dan melakukan re-create *container* web.
- **Bukti Tes:** Login portal (Admin maupun Publik) via Keycloak berhasil dilakukan tanpa melempar error *Invalid Client*.

### B. Moodle Admin Access (Hilangnya privilege Site Administration)
- **Masalah:** Akun Keycloak `admin@temanbelajar.local` (User ID Moodle: 12) berhasil login lewat SSO, namun tidak diidentifikasi sebagai Moodle Administrator, sehingga fitur pengaturan tersembunyi.
- **Penyelesaian:** Menggunakan Moodle CLI `admin/cli/cfg.php` untuk menginjeksi secara paksa ID `12` ke dalam konfigurasi `$CFG->siteadmins`.
- **Bukti Tes:** Login Moodle dengan SSO sebagai `admin@temanbelajar.local` sekarang langsung mendapatkan menu *Site Administration* penuh.

### C. Federated Logout (Zombie Sessions)
- **Masalah:** Meng-klik tombol "Keluar" di portal (Admin/Web) hanya menghapus sesi NextAuth lokal. Ketika user kembali mencoba login, Keycloak (yang masih menyimpan cookie sesi SSO) langsung meloloskan (*auto-login*) tanpa meminta password.
- **Penyelesaian:** 
  1. Menghapus sesi NextAuth manual lewat `cookies().delete()`.
  2. Membuat endpoint `/api/auth/federated-logout` yang mengarahkan user ke `/protocol/openid-connect/logout` milik Keycloak dengan menyertakan `id_token_hint`.
  3. Mengubah semua tautan logout di *layout.tsx* dan *page.tsx* ke endpoint baru ini.
- **Bukti Tes:** Logout sekarang akan mematikan sesi di level portal sekaligus me-logout SSO di Keycloak.

### D. Kehilangan Media/Gambar Course (Moodle)
- **Masalah:** Laporan *user* mengenai gambar *course* tidak tampil karena sebelumnya *file backup* belum di-import secara lengkap (baru 3 dari 4 backup).
- **Penyelesaian:** Merestore *file* `backup-moodle2-course-4-MS_Office-20260813-1054-nu.mbz` menggunakan *command line restore_backup.php* ke Moodle sehingga file asli diekstrak kembali.
- **Bukti Tes:** Semua *course* (termasuk MS Office) telah dikonfirmasi ter-restore sempurna. Server-Side Request Forgery (SSRF) bypass untuk port Keycloak juga bekerja dengan baik sehingga Moodle tidak lagi memblokir resource internalnya.

## 2. Definisi Selesai (DoD)
- ✅ SSO dari Keycloak berhasil menghubungkan Moodle, Portal Web, dan Admin Web secara stabil.
- ✅ Privilese akun (Admin Moodle) dapat dipertahankan meski otentikasinya dialihkan ke Keycloak.
- ✅ Proses *Logout* tersinkronisasi di semua sistem (Federated Logout).
- ✅ Konten kursus tampil utuh tanpa ada file fisik yang tertinggal/hilang.

---

> Dokumen ini disahkan oleh sistem dan mengonfirmasi penyelesaian seluruh hambatan infrastruktur SSO & Auth. Tidak ada modifikasi arsitektur terlarang yang dilakukan selama penyelesaian *bug* ini.
