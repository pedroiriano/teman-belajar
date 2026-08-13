# TASK-006: My Learning Dashboard & Learner Experience — HANDOFF

## 1. Ringkasan Status
- **Status:** SELESAI (DONE)
- **Komponen Utama:** Portal Web - `My Learning Dashboard`
- **Integrasi Backend:** Moodle API via `api/v1/learning/*` (BFF)

## 2. Fitur yang Diselesaikan
### A. My Learning Dashboard (`/my-learning`)
Halaman khusus otentikasi (Learner Portal) yang menampilkan:
- **Ringkasan Pembelajaran:** Total kursus, jumlah kursus yang sedang berjalan, dan yang sudah selesai.
- **Continue Learning:** Modul cepat untuk melanjutkan kursus terakhir yang diakses, langsung menghubungkan pengguna ke Moodle.
- **My Courses List:** Menampilkan daftar kursus pengguna dengan indikator progres visual (*progress bar*) dan status (*badge*).
- **Course Detail Drawer:** Komponen interaktif *slide-over* (dibangun dari nol mengikuti arsitektur Techwind) untuk melihat silabus/modul kursus, status kelulusan, dan nilai tanpa perlu berpindah halaman.
- **Aksi Langsung Moodle:** Integrasi tautan SSO Seamless langsung menuju Moodle LMS untuk mengikuti pembelajaran formal (Go to Moodle).

### B. Perbaikan Stabilitas Autentikasi (OIDC & NextAuth)
- **Token Decryption Fix:** Beralih dari ekstraksi token NextAuth statis ke integrasi `getToken()` natif NextAuth untuk mengelola *chunked session cookies* (>4KB Keycloak tokens). Mencegah masalah *login loop* dan *infinite redirect*.
- **Federated Logout Fix:** Menambahkan logika pembersihan semua kepingan *cookie* NextAuth secara dinamis pada saat *Logout*.
- **Logout Client_id Fallback:** Menerapkan strategi pencadangan *logout* `client_id` pada rute `federated-logout` di Portal Web dan Admin Web untuk berjaga-jaga apabila sesi `idToken` lokal kadaluarsa.
- **Navigasi Logis:** Memecahkan masalah konfik *Next.js Client Router* yang mengganggu pengalihan API Route dengan menggunakan elemen `<a href>` pada menu keluar, yang kini telah disetujui secara sintaksis oleh *linter*.

### C. UI & UX Refinement
- Menyelaraskan seluruh gaya visual antara `/announcements` dan `/news`.
- Memberlakukan aturan penamaan standar untuk bahasa Inggris dalam rute (*routing*) aplikasi seperti yang ditetapkan.

## 3. Catatan Teknis / Deployment
- Sistem telah siap secara penuh dengan *Zero JavaScript Error* di konsol klien.
- ESLint (Next.js config) telah diluruskan tanpa menonaktifkan keamanan tipe, khusus pada pengecualian navigasi keluar (hard navigation).
- Container Docker untuk `web` dan `admin` sudah di-build ulang dengan fitur ini aktif.

## 4. Persiapan TASK Berikutnya (TASK-007)
Sistem Moodle Adapter kini telah terbukti sanggup memberikan *contract* stabil, dan Dashboard Portal terbukti mampu merendernya dalam pengalaman UI berstandar tinggi. TASK-006 dinyatakan *READY FOR NEXT STAGE*.
