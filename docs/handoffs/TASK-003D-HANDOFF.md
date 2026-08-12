# TASK-003D Handoff — Docker Runtime Normalization and Governance

> **Historical dependency note:** Catatan Next.js 14.2.35 dan risiko audit pada
> handoff ini telah diselesaikan dan digantikan oleh `TASK-003F-HANDOFF.md`.
> Registry Docker/port/volume di dokumen ini tetap berlaku.

**Tanggal:** 2026-08-12
**Status implementasi Docker:** selesai dan berjalan
**Scope:** nama service/container/image, port, env/secret, network, volume, bootstrap, health check, runbook, governance, dan verifikasi runtime lokal

## 1. Ringkasan Hasil

Stack Docker lokal telah dinormalisasi tanpa kehilangan data. Runtime sekarang memakai Compose project `teman-belajar`, service key pendek yang stabil, nama container kanonis, satu network, enam named volume bersih, port host khusus yang hanya bind ke loopback, secret di `.env` ignored, health check untuk semua long-running service, dan wrapper PowerShell yang memvalidasi konfigurasi sebelum operasi.

Handoff ini menggantikan semua perintah Docker dan nama service pada handoff lama bila terdapat perbedaan. Pedoman kanonis tetap `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md`.

## 2. Temuan Awal yang Dikoreksi

1. Service key `portal-web`, `admin-web`, `portal-api`, `portal-migrate`, `postgres-portal`, dan `postgres-moodle` menghasilkan penamaan runtime yang tidak konsisten dengan registry produk.
2. Semua published port bind ke `0.0.0.0`, sehingga dependency lokal terekspos ke interface jaringan lain.
3. Port dependency memakai angka umum `5432`, `5433`, `6379`, `9000`, `9001`; Windows secara nyata menolak bind `5432` meski tidak ada listener.
4. Password database, MinIO, Keycloak, OIDC, NextAuth, Moodle, serta akun seed tertanam pada Compose/realm/entrypoint.
5. Variabel API salah bernama `KEYCLOAK_URL`, sedangkan kode membaca `KEYCLOAK_ISSUER_URL`.
6. Issuer internal `keycloak:8080` tidak boleh dipakai karena browser dan API harus memverifikasi nilai `iss` yang identik.
7. Enam volume menjadi nama ganda `teman-belajar_teman-belajar_*` karena key volume sudah menyertakan project prefix.
8. Redis, MinIO, Moodle, Portal, dan Admin belum memiliki health behavior yang lengkap.
9. Moodle menyimpan hostname/password DB lama di `config.php`, sehingga perubahan env tidak berlaku setelah instalasi pertama.
10. Moodle menelan error upgrade dengan `|| true`, memakai permission `2777`, password admin hard-coded, dan chown rekursif yang bentrok dengan plugin read-only.
11. Dockerfile web memakai `npm install`, sehingga lockfile yang tidak sinkron diperbaiki diam-diam saat build.
12. `infrastructure/docker/README.md` masih placeholder dan root quick start menyatakan web/admin harus dijalankan manual walaupun sudah ada di Compose.

## 3. Registry Runtime Final

| Service | Container | Image | Host endpoint | Expected state |
|---|---|---|---|---|
| `web` | `teman-belajar-web-1` | `teman-belajar-web:local` | `127.0.0.1:3000` | healthy |
| `admin` | `teman-belajar-admin-1` | `teman-belajar-admin:local` | `127.0.0.1:3001` | healthy |
| `api` | `teman-belajar-api-1` | `teman-belajar-api:local` | `127.0.0.1:8080` | healthy |
| `migrate` | `teman-belajar-migrate-1` | `teman-belajar-api:local` | none | Exited (0) |
| `portal-db` | `teman-belajar-portal-db-1` | `postgres:15.15-alpine` | `127.0.0.1:15432` | healthy |
| `moodle-db` | `teman-belajar-moodle-db-1` | `postgres:16.14-alpine` | `127.0.0.1:15433` | healthy |
| `redis` | `teman-belajar-redis-1` | `redis:7.4.9-alpine` | `127.0.0.1:16379` | healthy |
| `keycloak` | `teman-belajar-keycloak-1` | `keycloak:22.0.5` | `127.0.0.1:8081` | healthy |
| `moodle` | `teman-belajar-moodle-1` | `teman-belajar-moodle:local` | `127.0.0.1:8082` | healthy |
| `minio` | `teman-belajar-minio-1` | pinned MinIO release | `127.0.0.1:19000/19001` | healthy |

Network final hanya `teman-belajar-network`. Volume final:

- `teman-belajar-portal-db-data`
- `teman-belajar-moodle-db-data`
- `teman-belajar-redis-data`
- `teman-belajar-minio-data`
- `teman-belajar-moodle-app-data`
- `teman-belajar-moodle-data`

Lima image tag lama yang tidak lagi dipakai juga dihapus secara exact: `teman-belajar-portal-web:latest`, `teman-belajar-admin-web:latest`, `teman-belajar-portal-api:latest`, `teman-belajar-portal-migrate:latest`, dan `teman-belajar-moodle:latest`. Tidak ada global image prune.

## 4. Migrasi Data yang Dilakukan

1. Snapshot sebelum migrasi:
   - Portal public tables: `8`
   - Keycloak realms: `2`
   - Moodle public tables: `490`
   - Moodle users: `2`
   - Redis keys: `0`
2. Stack lama dihentikan tanpa `--volumes`.
3. Enam volume target dibuat dengan nama kanonis.
4. Setiap volume sumber dipasang read-only dan disalin ke satu target exact.
5. Portal PostgreSQL tetap major 15 dan Moodle PostgreSQL tetap major 16; tidak ada major data upgrade.
6. Password role database lokal dirotasi. Database Keycloak diberi role terpisah `teman_belajar_keycloak`; ownership 92 objek public Keycloak dipindahkan ke role tersebut.
7. Tiga secret OIDC client dan dua password akun seed dirotasi dari nilai lama.
8. Password administrator Moodle yang pernah dibuat dari nilai hard-coded lama dirotasi melalui CLI Moodle ke secret ignored `.env`.
9. Client web origin dibatasi ke URL exact; wildcard origin `+` dihapus dari seed realm.
10. Stack baru dinyalakan dan data invariant diverifikasi ulang dengan hasil identik: `8`, `2`, `490`, `2`.
11. Enam volume lama `teman-belajar_teman-belajar_*` dihapus hanya setelah verifikasi label project dan invariant berhasil.

Data lama tidak lagi berada pada volume ganda. Penghapusan volume lama tidak dapat dipulihkan dari Docker; salinan kanonis yang telah diverifikasi adalah sumber aktif.

## 5. Perubahan Konfigurasi Utama

- Compose memakai service key `web`, `admin`, `api`, `migrate`, `portal-db`, `moodle-db`, `redis`, `keycloak`, `minio`, `moodle`.
- Tidak ada `container_name`.
- Image aplikasi diberi tag lokal eksplisit.
- Published port dikendalikan `TB_*_PORT` dan bind default `127.0.0.1`.
- Port dependency host bergeser ke blok `15xxx`, `16xxx`, `19xxx`; port internal tetap standar.
- Credential runtime dipindahkan ke ignored `infrastructure/docker/.env` dengan template placeholder `.env.example`.
- Redis memakai password dan AOF.
- `init-db.sh` membuat database/role Keycloak secara terpisah untuk instalasi baru.
- Issuer lintas host/container memakai `keycloak.teman-belajar.localhost` serta `host-gateway` mapping.
- Semua long-running service memiliki health check dan restart policy.
- Moodle `sync-config.php` menyinkronkan hanya `dbhost`, `dbname`, `dbuser`, `dbpass`, `wwwroot`, dan `dataroot`; struktur tak terduga menyebabkan startup gagal.
- Moodle upgrade tidak lagi mengabaikan kegagalan; plugin mounted read-only dan tidak disentuh chown rekursif.
- Portal/Admin Dockerfile memakai Node 22 dan `npm ci`; API runtime dipin `alpine:3.22`.
- Next.js Portal/Admin dipatch dari `14.2.5` ke `14.2.35` berdasarkan advisory resmi untuk release line 14.
- Wrapper PowerShell menolak missing key, placeholder, invalid port, dan duplicate port sebelum Compose berjalan.

## 6. Berkas Penting

### Ditambah

- `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md`
- `infrastructure/docker/.env.example`
- `infrastructure/docker/teman-belajar-docker.ps1`
- `infrastructure/docker/moodle/sync-config.php`
- `docs/handoffs/TASK-003D-HANDOFF.md`

### Diubah

- `AGENTS.md`
- `00-INDEX.md`
- `README.md`
- `Makefile`
- `docs/handoffs/README.md`
- `infrastructure/docker/README.md`
- `infrastructure/docker/docker-compose.yml`
- `infrastructure/docker/init-db.sh`
- `infrastructure/docker/moodle/Dockerfile`
- `infrastructure/docker/moodle/entrypoint.sh`
- `infrastructure/keycloak/teman-belajar-realm.json`
- `apps/portal-web/Dockerfile`, `package.json`, `package-lock.json`
- `apps/admin-web/Dockerfile`, `package.json`, `package-lock.json`
- `services/portal-api/Dockerfile`

Local-only `infrastructure/docker/.env` dibuat dan dipakai, tetapi diabaikan Git dan tidak boleh disalin ke handoff/commit.

## 7. Bukti Verifikasi

### Compose dan wrapper

```text
teman-belajar-docker.ps1 config -> PASS; 10 service terdaftar
teman-belajar-docker.ps1 verify -> PASS
Portal API  HTTP 200
Portal Web  HTTP 200
Admin Web   HTTP 200
Keycloak    HTTP 200
Moodle      HTTP 200
MinIO       HTTP 200
```

### Build

```text
teman-belajar-api:local    -> built
teman-belajar-web:local    -> Next.js 14.2.35 build PASS
teman-belajar-admin:local  -> Next.js 14.2.35 build PASS
teman-belajar-moodle:local -> built
```

### Code checks dan operator path

```text
go test ./... -> PASS
go vet ./...  -> PASS
teman-belajar-docker.ps1 up -> PASS (build + remove-orphans + wait)
Compose/shell/PHP/Keycloak JSON syntax -> PASS
legacy credential literal scan -> PASS
```

### Runtime

Semua sembilan long-running service `healthy`. Job `migrate` `Exited (0)`. Semua published port tampil sebagai `127.0.0.1`, tidak ada binding `0.0.0.0`. Hanya satu network dan enam volume kanonis.

### Data invariant

```text
portal_tables=8
keycloak_realms=2
moodle_tables=490
moodle_users=2
```

## 8. Risiko Terbuka yang Tidak Boleh Disembunyikan

`npm audit --omit=dev --audit-level=high` masih melaporkan advisory high pada Next.js/PostCSS yang pada registry saat ini hanya menawarkan perbaikan otomatis melalui Next.js 16. Upgrade 14 → 16 adalah major framework upgrade dan dilarang dilakukan diam-diam oleh `AGENTS.md`; perlu task terpisah, impact analysis, tes regresi, dan persetujuan manusia. Jangan menjalankan `npm audit fix --force`.

Image Keycloak 22.0.5 dan MinIO release 2023 dipertahankan agar tidak memicu upgrade stateful besar di scope ini. Buat task upgrade terpisah dengan backup/rollback.

## 9. Langkah Wajib untuk Agent/Gemini Berikutnya

1. Baca `AGENTS.md`.
2. Baca `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md` seluruhnya.
3. Baca `infrastructure/docker/README.md` dan handoff ini.
4. Jangan menggunakan nama service lama dari handoff historis.
5. Jalankan:

   ```powershell
   git status --short
   powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 config
   powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 status
   ```

6. Jangan mengubah `.env` kecuali task memang menyentuh port/credential lokal; jangan pernah mencetak nilainya.
7. Gunakan service key exact pada Compose: contoh `docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml logs --tail 200 api`.
8. Setelah perubahan, wajib build, `verify`, audit dependency, cek data invariant bila relevan, dan review diff.
9. Stop dan minta keputusan manusia untuk major upgrade, bind `0.0.0.0`, volume delete/reset, database migration destruktif, permission weakening, atau hasil invariant yang berbeda.

## 10. Rollback Operasional

Untuk perubahan container/image biasa, rollback harus memakai Git revision konfigurasi sebelumnya dan named volume kanonis yang sama; jangan membuat ulang data. Untuk perubahan data berikutnya, buat backup sebelum eksekusi. Volume lama bernama ganda dari sebelum TASK-003D sudah dihapus setelah migrasi tervalidasi, sehingga rollback ke nama volume lama memerlukan restore dari backup baru, bukan mengandalkan Docker volume lama.
