# Panduan Operasional Docker Lokal — Teman Belajar

Pedoman wajib: `docs/governance/DOCKER-LOCAL-ENVIRONMENT.md`.

## Prasyarat

- Docker Desktop dengan Docker Compose v2;
- PowerShell 7 atau Windows PowerShell 5.1;
- `curl.exe` tersedia pada PATH;
- port pada `infrastructure/docker/.env` tidak digunakan proses lain.

## Bootstrap Pertama

```powershell
Copy-Item infrastructure/docker/.env.example infrastructure/docker/.env
# Edit .env dan ganti SEMUA nilai CHANGE_ME.
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 config
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 up
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 verify
```

`up` membangun image, menghapus orphan container proyek, menunggu health, lalu menampilkan status. Perintah tidak menghapus volume.

## Perintah Harian

```powershell
# Validasi environment, port, dan Compose tanpa memulai service
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 config

# Status termasuk job migrasi
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 status

# Tail 200 baris log seluruh service
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 logs

# Rekonsiliasi idempotent tiga client SSO/SLO Keycloak kanonis
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 sso

# Smoke test status + delapan endpoint
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 verify

# Validasi sintaks konfigurasi dan seluruh alert rule Prometheus
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 observability-verify

# Build dan jalankan migrator saja; tidak merekonsiliasi atau mengubah SSO
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 migrate-verify

# Stop container/network; volume dipertahankan
powershell -NoProfile -ExecutionPolicy Bypass -File infrastructure/docker/teman-belajar-docker.ps1 down
```

Alias Makefile: `make docker-config`, `make up`, `make status`, `make logs`, `make sso`, `make verify`, `make observability-verify`, dan `make down`.

## URL Default

- Portal: `http://localhost:3000`
- Admin: `http://localhost:3001`
- API health: `http://localhost:8080/api/v1/health`
- Keycloak: `http://keycloak.teman-belajar.localhost:8081`
- Moodle: `http://localhost:8082`
- MinIO API: `http://localhost:19000`
- MinIO Console: `http://localhost:19001`
- Meilisearch: `http://localhost:7700`
- Grafana teknis: `http://localhost:3002`
- Portal PostgreSQL: `127.0.0.1:15432`
- Moodle PostgreSQL: `127.0.0.1:15433`
- Redis: `127.0.0.1:16379`

## Kondisi Status yang Benar

- `web`, `admin`, `api`, `portal-db`, `moodle-db`, `redis`, `keycloak`, `minio`, `search`, dan `moodle`: `healthy`.
- `search-worker`, `analytics-worker`, `moodle-cron`, `prometheus`, `grafana`, `otel-collector`, `loki`, dan `tempo`: running; hanya Grafana membuka port host.
- `migrate`: `Exited (0)`.
- Network: hanya `teman-belajar-network`.
- Volume: sebelas nama pada registry governance; tidak ada prefix ganda `teman-belajar_teman-belajar_*`.

## Port Bentrok

1. Jalankan `Get-NetTCPConnection -State Listen` dan periksa port target.
2. Pilih port host yang kosong pada `.env`; jangan mengubah port internal Compose.
3. Bila Portal/Admin/Keycloak/Moodle berubah, ubah URL pasangannya dalam edit yang sama.
4. Jalankan action `config`, kemudian `up` dan `verify`.
5. Jangan menghentikan proses yang bukan milik Teman Belajar tanpa izin pemiliknya.

## Troubleshooting Terarah

- `Missing ... .env` atau `CHANGE_ME`: lengkapi file lokal; jangan hard-code ke YAML.
- Service `unhealthy`: jalankan action `status`, lalu `docker compose --env-file infrastructure/docker/.env -f infrastructure/docker/docker-compose.yml logs --tail 200 <service>`.
- Moodle database gagal setelah hostname/password berubah: jangan edit manual sembarang baris; periksa output `sync-config.php` dan enam env Moodle.
- OIDC issuer mismatch: pastikan semua aplikasi memakai `TB_KEYCLOAK_URL`, bukan DNS internal `keycloak:8080`.
- Migrasi gagal: jangan memulai API secara paksa; periksa log `migrate` dan database.
- Data terlihat kosong: stop. Jangan `down -v`, prune, atau menginisialisasi ulang; periksa nama/mount volume dan minta review manusia.
- Search gagal: ikuti `docs/runbooks/SEARCH-OPERATIONS.md`; jangan menghapus volume atau memasukkan key ke URL/log.

## Larangan Operasional

Jangan menjalankan `docker compose down -v`, `docker volume prune`, `docker system prune`, menghapus volume dengan wildcard, atau mengganti major image database. Operasi data destruktif membutuhkan backup, target exact, invariant, rollback, dan persetujuan manusia.
