# TASK-003AB HANDOFF

## Status: PASS & READY FOR TASK-004

### 1. Tujuan
Membangun infrastruktur Moodle 5.2.2+ secara lokal via `.tgz` di dalam ekosistem Teman Belajar dengan PHP 8.3 Apache dan PostgreSQL 16 tanpa mengandalkan image registry Moodle Bitnami yang telah usang.

### 2. Apa yang Telah Diselesaikan
1. **Source Code Hygiene**: File `moodle-5.2.2.tgz` ditempatkan di `infrastructure/docker/moodle` dan di-ignore dari komit Git (melalui `.gitignore`) sehingga tidak membebani repository utama.
2. **Custom Moodle Docker Image**:
   - Berbasiskan **PHP 8.3 Apache** (mendukung persyaratan ketat PHP >= 8.3 untuk Moodle 5.2+).
   - Seluruh dependensi extension dikompilasi secara dinamis ke image: `pgsql`, `pdo_pgsql`, `gd` (+freetype, jpeg), `zip`, `intl`, `soap`, `sodium`, `opcache`, dan `exif`.
   - `DocumentRoot` Apache telah secara manual diarahkan ke `/var/www/html/public` (Moodle 5.x Public Directory Requirement).
3. **Automated Provisioning (Entrypoint)**:
   - Disediakan `entrypoint.sh` yang memeriksa eksistensi `config.php`.
   - Mampu mengeksekusi _Moodle CLI Installer_ (`admin/cli/install.php`) jika instans Moodle masih kosong.
   - Variabel lingkungan (Environment Variables) dari `.env` docker-compose diteruskan ke *CLI Installer* untuk instalasi *zero-touch*.
4. **PostgreSQL Compatibility Upgrade**:
   - Moodle 5.2.x menolak bekerja di bawah PostgreSQL 15, sehingga *docker-compose.yml* telah disesuaikan agar `postgres-moodle` berjalan dengan image `postgres:16-alpine`.

### 3. Verification & Evidence
1. **Health Check & Logs**:
   - Konfirmasi dari standard output: `Installation completed successfully.`
   - Apache telah merespon dengan indikator operasi reguler pada `[mpm_prefork:notice]`.
2. **Port 8082 End-to-End**:
   - Uji akses ke Endpoint `http://localhost:8082` menggunakan Powershell HTTP request mengembalikan `HTTP/1.1 303 See Other` (Moodle Redirect) yang menandakan Moodle Application Engine telah merespons dan aktif 100%.

### 4. Known Issues (OOS/Diteruskan ke tahap berikut)
- Integrasi SSO Keycloak OIDC belum dilakukan konfigurasi pada sisi frontend Moodle (Administrator Dashboard), namun hal ini berada di luar scope *infrastructure baseline* ini.

### 5. Next Steps
Sistem dinyatakan sepenuhnya **READY FOR TASK-004 Media Object Storage**.
Harap fokus pada integrasi MinIO/Object Storage untuk sistem berkas (File Distribution/Attachment CMS) Teman Belajar.
