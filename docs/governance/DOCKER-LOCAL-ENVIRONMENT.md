# Pedoman dan Aturan Docker Lokal — Teman Belajar

**Status:** Canonical Governance
**Scope:** `infrastructure/docker/` dan seluruh runtime Docker lokal
**Compose project:** `teman-belajar`

Dokumen ini adalah source of truth untuk nama service, port, environment, network, volume, operasi, dan perubahan Docker lokal. Bila handoff lama berbeda, dokumen ini dan handoff terbaru yang merujuknya menang.

## 1. Tujuan

- satu identitas runtime yang mudah dibaca;
- tidak ada port host yang saling bertabrakan;
- dependency hanya terbuka pada loopback secara default;
- secret tidak masuk Git;
- data Portal, Keycloak, Moodle, Redis, dan MinIO bertahan saat container direcreate;
- perintah agent bersifat deterministik, dapat diverifikasi, dan tidak destruktif.

## 2. Registry Service Kanonis

| Compose key | Identitas produk/komponen | Nama container normal | Internal endpoint |
|---|---|---|---|
| `web` | `teman-belajar-web` | `teman-belajar-web-1` | `http://web:3000` |
| `admin` | `teman-belajar-admin` | `teman-belajar-admin-1` | `http://admin:3000` |
| `api` | `teman-belajar-api` | `teman-belajar-api-1` | `http://api:8080` |
| `migrate` | job migrasi Portal | `teman-belajar-migrate-1` | tidak membuka port |
| `portal-db` | PostgreSQL Portal + server DB Keycloak | `teman-belajar-portal-db-1` | `portal-db:5432` |
| `moodle-db` | PostgreSQL milik Moodle | `teman-belajar-moodle-db-1` | `moodle-db:5432` |
| `redis` | cache/message dependency | `teman-belajar-redis-1` | `redis:6379` |
| `keycloak` | central identity | `teman-belajar-keycloak-1` | `keycloak:8080` |
| `minio` | object storage lokal | `teman-belajar-minio-1` | `minio:9000` |
| `moodle` | Moodle Learning Engine | `teman-belajar-moodle-1` | `moodle:80` |

Nama lama `portal-web`, `admin-web`, `portal-api`, `portal-migrate`, `postgres-portal`, dan `postgres-moodle` tidak boleh dipakai pada perintah baru. Jangan menambahkan `container_name`; project + service key sudah menghasilkan nama kanonis dan tetap mendukung recreate/scale.

## 3. Registry Port Host

| Service | Variabel | Default host | Port internal | Tujuan |
|---|---|---:|---:|---|
| Portal Web | `TB_WEB_PORT` | `3000` | `3000` | browser |
| Admin Web | `TB_ADMIN_PORT` | `3001` | `3000` | browser |
| Portal API | `TB_API_PORT` | `8080` | `8080` | API/smoke test |
| Keycloak | `TB_KEYCLOAK_PORT` | `8081` | `8080` | OIDC/browser |
| Moodle | `TB_MOODLE_PORT` | `8082` | `80` | browser |
| Portal PostgreSQL | `TB_PORTAL_DB_PORT` | `15432` | `5432` | client DB host |
| Moodle PostgreSQL | `TB_MOODLE_DB_PORT` | `15433` | `5432` | client DB host |
| Redis | `TB_REDIS_PORT` | `16379` | `6379` | debug lokal |
| MinIO API | `TB_MINIO_API_PORT` | `19000` | `9000` | S3 API |
| MinIO Console | `TB_MINIO_CONSOLE_PORT` | `19001` | `9001` | browser |

Aturan:

1. Semua published port wajib berbentuk `${TB_BIND_ADDRESS}:${TB_*_PORT}:<internal>`.
2. Default `TB_BIND_ADDRESS=127.0.0.1`; jangan gunakan `0.0.0.0` tanpa persetujuan keamanan manusia.
3. Port internal dan DNS service tidak berubah ketika port host diubah.
4. Bila port host berubah, URL pasangannya wajib berubah pada edit yang sama: `TB_WEB_URL`, `TB_ADMIN_URL`, `TB_KEYCLOAK_URL`, atau `TB_MOODLE_URL`.
5. Wrapper menolak port kosong, di luar rentang 1–65535, atau duplikat.

## 4. Environment dan Secret

- Template yang boleh di-commit: `infrastructure/docker/.env.example`.
- Nilai runtime lokal: `infrastructure/docker/.env`; file ini diabaikan Git.
- Semua `CHANGE_ME` pada hasil salinan template wajib diganti sebelum startup.
- Password database harus URL-safe karena dipakai untuk menyusun `DATABASE_URL`.
- Secret OIDC antara Keycloak dan aplikasi harus persis sama.
- Secret Portal NextAuth dan Admin NextAuth wajib berbeda dan minimal 32 byte acak.
- Akun seed hanya fixture development. Jangan gunakan credential lokal ini pada staging/production.
- Mengubah password admin Moodle pada `.env` hanya memengaruhi instalasi baru. Rotasi instalasi yang sudah ada harus memakai CLI resmi `admin/cli/reset_password.php` dan dicatat di handoff tanpa menulis nilainya.
- Jangan menulis secret ke README, handoff, issue, prompt, screenshot, atau log.

Issuer Keycloak lokal adalah `http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar`. Nama `*.localhost` menuju loopback pada host; Compose memetakannya ke host gateway pada container aplikasi. Jangan mengganti issuer API dengan DNS internal `http://keycloak:8080`, karena nilai `iss` token harus identik bagi browser dan API.

## 5. Network, Volume, dan Data Ownership

Satu-satunya network proyek adalah `teman-belajar-network`. Service berkomunikasi memakai Compose DNS, bukan IP container.

| Volume | Pemilik data |
|---|---|
| `teman-belajar-portal-db-data` | Portal PostgreSQL dan database Keycloak yang terpisah |
| `teman-belajar-moodle-db-data` | Moodle PostgreSQL |
| `teman-belajar-redis-data` | Redis AOF |
| `teman-belajar-minio-data` | MinIO objects |
| `teman-belajar-moodle-app-data` | Moodle application/config runtime |
| `teman-belajar-moodle-data` | Moodle dataroot |

Larangan mutlak tanpa persetujuan manusia:

- `docker compose down --volumes`, `docker compose down -v`;
- `docker volume prune`, `docker system prune`;
- menghapus volume dengan wildcard;
- mengganti major PostgreSQL pada volume yang ada;
- menyalin database Moodle ke database Portal atau sebaliknya;
- query langsung Moodle dari Portal/API.

Normal recreate container tidak menghapus volume. Sebelum migrasi volume: hentikan writer, catat count/invariant, salin ke volume baru, boot dan verifikasi, baru hapus sumber exact setelah approval dan label ownership diperiksa.

## 6. Health, Dependency, dan Lifecycle

- Semua long-running service wajib memiliki health check.
- `migrate` adalah one-shot job; kondisi benar adalah `Exited (0)`.
- `api` menunggu `migrate` selesai serta Keycloak/Redis sehat.
- `web` dan `admin` menunggu API serta Keycloak sehat.
- `moodle` menunggu `moodle-db` sehat.
- Moodle menyinkronkan enam nilai runtime yang diizinkan di `config.php` sebelum upgrade/start; sinkronisasi harus gagal tertutup bila struktur file tidak cocok.
- Jangan menambahkan `|| true` pada migrasi, upgrade, atau health-critical bootstrap.

## 7. Versi Image dan Dependency

- Image infrastruktur harus dipin minimal sampai patch version atau release tag eksplisit.
- Image aplikasi lokal harus eksplisit: `teman-belajar-web:local`, `teman-belajar-admin:local`, `teman-belajar-api:local`, `teman-belajar-moodle:local`.
- Dockerfile Node memakai `npm ci`; manifest dan lockfile harus sinkron.
- Major upgrade database, Keycloak, Moodle, Node, Next.js, Go, atau base OS memerlukan impact analysis, backup/rollback, test, dan persetujuan manusia bila berdampak material.
- Jangan memakai `latest` untuk runtime final.

## 8. Protokol Wajib untuk AI/Coding Agent (termasuk Gemini AI Pro)

Sebelum perubahan:

1. Baca `AGENTS.md`, dokumen ini, `infrastructure/docker/README.md`, task aktif, dan handoff terbaru.
2. Jalankan `git status --short`; jangan menimpa perubahan pengguna.
3. Jalankan wrapper action `config` dan `status`.
4. Inventaris service, published port, network, volume, dan data owner.
5. Nyatakan rencana serta dampak data sebelum edit.

Saat perubahan:

1. Edit hanya berkas scope Docker/dokumentasi/dependency yang diperlukan.
2. Pertahankan Compose project dan service key registry.
3. Jangan hard-code secret atau published port.
4. Jangan mengubah versi major atau menghapus volume atas asumsi.
5. Tambahkan/ubah health check serta dokumentasi pada perubahan yang sama.
6. Gunakan `docker compose`, bukan binary legacy `docker-compose`.

Sebelum menyatakan selesai:

1. `teman-belajar-docker.ps1 config` harus PASS.
2. Build aplikasi harus PASS dengan `npm ci`/Go build.
3. `teman-belajar-docker.ps1 verify` harus PASS.
4. Semua long-running service harus `healthy`; `migrate` harus `Exited (0)`.
5. Tidak boleh ada orphan container/network/volume bernama lama.
6. Verifikasi data invariants bila volume/database disentuh.
7. Jalankan audit dependency; jangan menyembunyikan hasil yang butuh upgrade berisiko.
8. Tulis handoff berisi perubahan, bukti, risiko tersisa, rollback, dan perintah berikutnya.

## 9. Format Prompt Ketat untuk Gemini AI Pro

Gunakan format berikut; jangan memberi prompt umum seperti “rapikan Docker”.

```text
TASK: <satu tujuan terbatas>
SCOPE ALLOWED: <daftar file/service exact>
SCOPE FORBIDDEN: architecture rewrite, container_name, port hard-code,
  secret commit, major upgrade, volume deletion, docker system prune
MANDATORY READ: AGENTS.md; docs/governance/DOCKER-LOCAL-ENVIRONMENT.md;
  infrastructure/docker/README.md; <task>; <handoff terbaru>
PRESERVE: Compose project teman-belajar; service keys; internal DNS/ports;
  named volumes; user changes
ACCEPTANCE CRITERIA: <hasil terukur>
MANDATORY VERIFY: wrapper config; build; wrapper verify; data invariant;
  git diff review; dependency audit
OUTPUT: changed files; commands + results; unresolved risks; rollback;
  next safe command
STOP CONDITIONS: missing .env; CHANGE_ME; duplicate port; ambiguous data owner;
  major upgrade; destructive action; failed invariant; secret exposure
```

Agent wajib berhenti dan meminta keputusan manusia pada setiap `STOP CONDITIONS`. Agent dilarang “memperbaiki” kegagalan dengan menonaktifkan test, health check, auth, atau audit.
