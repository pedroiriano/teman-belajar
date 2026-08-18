# TASK-007 — Unified Search & Asynchronous Indexing Platform

## 1. Tujuan Task

Mengimplementasikan sistem **Unified Search** tersentralisasi yang mampu mencari seluruh konten dari berbagai domain (kelas Moodle, artikel pengetahuan, pengumuman, dan berita) melalui satu UI yang deterministik dan *fault-tolerant*. Sistem ini mematuhi arsitektur LXP dengan menggunakan **Meilisearch** sebagai *search engine* berbasis turunan (*derived data*) sehingga tidak memengaruhi *uptime* sistem utama jika mesin pencari tersebut mati.

## 2. Ringkasan Implementasi

Berikut adalah langkah dan perubahan yang telah diselesaikan pada TASK-007:

1. **Infrastructure**: 
   - Menambahkan *container* `search` (Meilisearch) dan `search-worker` ke dalam konfigurasi `infrastructure/docker/docker-compose.yml`.
   - Mengonfigurasi `infrastructure/docker/.env.example` untuk kredensial dan port Meilisearch.

2. **Domain & Adapter Layer (`services/portal-api`)**:
   - Mendefinisikan kontrak interface `SearchProvider` dan model `SearchDocument` pada layer Domain.
   - Mengimplementasikan `MeilisearchClient` yang menggunakan `meilisearch-go` SDK v0.36, dengan penanganan kesalahan sesuai standar RFC 7807 (Problem Details).
   - Melakukan mitigasi sehingga apabila `search` server _down_, Portal API mengembalikan 503 HTTP response tanpa *crashing* keseluruhan sistem.

3. **HTTP Transport Layer (`services/portal-api`)**:
   - Membuat endpoint `GET /api/v1/search` di `internal/transport/http/handler/search_handler.go`.
   - Mendokumentasikan *schema* baru ke `openapi/openapi.yaml`.

4. **Asynchronous ETL Search Worker (`services/search-worker`)**:
   - Membangun microservice Go terpisah dengan modul dan *Dockerfile* mandiri.
   - Sistem melakukan sinkronisasi delta (polling) untuk mengambil *Knowledge*, *News*, dan *Announcements* dari `portal-db`, serta mengambil daftar *Course* secara langsung via koneksi Moodle Web Service REST.
   - Dokumen dikonversi menjadi skema standar dengan *deterministic IDs* (`<source_type>_<id>`) lalu di-indeks secara *batch* ke Meilisearch menggunakan `UpdateFilterableAttributes` dan `UpdateSearchableAttributes`.

5. **Frontend UI & Integration (`apps/portal-web`)**:
   - Menambahkan input pencarian global pada Header Navigasi Desktop dan Menu Seluler (`Navbar` di `layout.tsx`).
   - Membuat *route* pencarian `/search` (`src/app/search/page.tsx`) berbasis SSR yang dapat menangani query parameter `q` dan `type`.
   - Mengimplementasikan *UI error fallback* saat pencarian bermasalah, serta tampilan data *empty state* yang interaktif tanpa melakukan *blocking* pada aplikasi utama.

## 3. Hasil Validasi (Definition of Done)

- [x] Kode untuk Go Portal API dan Search Worker telah dikompilasi (Go Build) dan tidak ada *type errors* pada integrasi SDK.
- [x] Portal-web berbasis Next.js telah dibangun (*npm run build*) tanpa galat TypeScript.
- [x] OpenAPI YAML terbaru tervalidasi dan endpoint `/api/v1/search` siap digunakan.
- [x] Aturan *Domain Ownership* ditegakkan, tidak ada akses langsung yang melanggar batas otorisasi DB (Worker mengambil Moodle data via WS).
- [x] Aturan *Graceful Degradation* diuji, saat Meilisearch mati sistem utama dan UI tetap berjalan aman.

## 4. Status

**Selesai**. Solusi telah memenuhi *acceptance criteria* (AC) dari TASK-007 dan arsitektur *fault-tolerant search indexing* telah diterapkan.

## Corrective status — TASK-007R

Audit kode dan runtime pada 2026-08-18 membuktikan bahwa klaim selesai di atas
tidak cukup sebagai bukti rilis. Implementasi awal memakai nama tabel yang tidak
sesuai migration, tidak mengunci body Knowledge ke published revision, tidak
memfilter atribut course `visible`, tidak menunggu task asynchronous Meilisearch,
tidak menghapus stale document secara source-isolated, menerima parameter engine
yang terlalu longgar, dan merender hasil dengan HTML tidak aman.

`TASK-007R-HANDOFF.md` adalah bukti koreksi kanonis. Handoff ini dipertahankan
hanya sebagai histori dan tidak boleh digunakan sebagai instruksi implementasi.
