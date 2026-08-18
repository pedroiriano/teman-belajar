# TASK-007R Handoff — Unified Search Correctness, Security, Source Isolation, Repository Hygiene & Canonical Release

## 1. Executive Summary

TASK-007R mengoreksi implementasi Unified Search, merapikan Portal Publik berbasis pola Techwind dan Portal Admin berbasis pola Cuba, mengunci konfigurasi Docker lokal, serta menghapus artefak operasional yang tidak layak dilacak. Implementasi dan verifikasi lokal lulus; insiden histori publik ditutup melalui rewrite dan force-push terkoordinasi yang disetujui manusia, remote refs bersih, dan CI GitHub lulus.

## 2. Task Scope

Scope mencakup Search API/worker/index, source publication isolation, UI Search, carry-forward TASK-006R, Portal/Admin UI, Docker, OpenAPI, keamanan dependency, dokumentasi canonical, repository hygiene, dan canonical Git release.

## 3. Source-of-Truth Documents Read

Agent membaca `AGENTS.md`, governance produk/Docker/security, canonical architecture 01–12, design-system, ADR-001–ADR-013, handoff TASK-005R/TASK-006/TASK-006R/TASK-007, dan master prompt TASK-007R sebelum perubahan.

## 4. Governance Compliance

Portal tetap memiliki experience/content, Moodle tetap memiliki formal learning, Keycloak tetap memiliki identity, dan tidak ada query langsung ke database Moodle. Search adalah derived store, bukan source of truth atau microservice bisnis baru.

## 5. Initial Git State

Branch awal `codex/ui-template-reconciliation` berada pada `5aa64ff` dan memiliki working tree perubahan UI yang dipertahankan serta diselesaikan.

## 6. Initial Remote Main

`origin/main` awal adalah `f7c9e87`; merge-base branch terhadap `origin/main` sama dengan `origin/main`, sehingga lineage implementasi sebelum penemuan insiden masih fast-forward.

## 7. TASK-007 Source Discovery

Implementasi lama menggunakan worker terpisah, kontrak query mentah, publication filtering yang belum lengkap, asynchronous Meilisearch task yang belum selalu ditunggu, dan belum memiliki ADR/runbook/security matrix memadai.

## 8. Historical Handoff Reconciliation

`TASK-007-HANDOFF.md` dipertahankan sebagai catatan historis dan diberi corrective note. Dokumen ini serta ADR-014 menjadi authority untuk hasil koreksi.

## 9. Repository Hygiene Audit

Audit menemukan dump database, empat backup Moodle, satu rekaman video, 16 skrip debug PHP root, dua fragmen OpenAPI obsolete, module worker duplikat, dan cache build lokal. Cache serta artefak lokal kini di-ignore.

## 10. Files Removed

Tip repository menghapus 7 artefak backup/dump/video, 16 skrip debug PHP, 2 fragmen OpenAPI, dan 4 file module worker lama. Salinan lokal artefak operasional yang di-ignore tidak dihapus.

## 11. Files Preserved

Data Docker volumes, ignored `.env`, backup lokal, dump lokal, rekaman lokal, vendor licensed originals, dan perubahan UI pengguna dipertahankan. Tidak ada volume reset atau prune.

## 12. Gitignore Reconciliation

`.gitignore` mencakup `.tmp/`, `/backups/`, `/temanbelajar_db.sql`, root MP4, `*.mbz`, `.env`, dan vendor `ORIGINAL` kecuali placeholder README.

## 13. Dev Security Audit

Local binding dibatasi loopback, semua host port wajib berasal dari ignored Docker `.env`, port unik divalidasi, placeholder ditolak, raw query capture dipaksa `false`, dan Meilisearch anonymous write mengembalikan HTTP 401.

## 14. Production Security Audit

Production memerlukan private network, TLS, external secret manager, scoped query-only key untuk API, admin key hanya untuk worker, raw query capture off, dan insecure Moodle OAuth flag off. Gap query-only key production tercatat dan tidak memiliki fallback anonymous.

## 15. Local Secret Scan

Tracked/staged source dan seluruh active development refs diperiksa terhadap pola private key, provider tokens, JWT, local secret files, serta tujuh path insiden tanpa mencetak nilai. Ignored local `.env`, backup, recovery bundle, dan `refs/original` incident recovery tidak termasuk source yang akan diterbitkan.

## 16. Staged Secret Scan

Hasil: 0 pola secret, 0 `infrastructure/docker/.env`, 0 vendor `ORIGINAL`, dan 0 `.tmp` pada staged content sebelum commit implementasi.

## 17. Local History Secret Scan

PASS untuk seluruh active development refs setelah rewrite: tujuh path menghasilkan 0 reachable commit pada calon main dan dua branch yang dirilis. Bundle recovery ignored dan `refs/original` lokal sengaja dipertahankan karena penghapusan/prune irreversible tidak termasuk persetujuan; keduanya tidak diterbitkan.

## 18. Remote Secret Scan

PASS: setelah approved rewrite, `origin/main`, `origin/antigravity/task-005-moodle-adapter`, dan `origin/codex/light-dark-themes` masing-masing menghasilkan 0 reachable commit untuk tujuh path insiden.

## 19. Vendor Asset Protection

Staged scan terhadap `vendor/ui-templates/*/ORIGINAL/**` menghasilkan 0 file. Implementasi menggunakan adaptasi token/pattern, tanpa purchase code, credential, atau wholesale demo copy.

## 20. Search Engine ADR

Keputusan tersedia pada `docs/adr/ADR-014-unified-search-engine-selection.md`, berstatus Accepted, dengan pembandingan Meilisearch, Typesense, OpenSearch, dan PostgreSQL FTS.

## 21. Meilisearch Server Version

Server dipin tepat ke `getmeili/meilisearch:v1.6.2`; runtime `/version` mengonfirmasi 1.6.2.

## 22. Go SDK Version

Go SDK adalah `github.com/meilisearch/meilisearch-go v0.36.3` dalam module Portal API.

## 23. Search Architecture

Browser memanggil typed public API; handler memanggil application service; service memanggil provider port; adapter Meilisearch menjadi dependency terisolasi. Engine metadata tidak masuk DTO publik.

## 24. Search Worker Architecture

Worker dibangun dari module Portal API melalui `cmd/search-worker` dan `Dockerfile.search-worker`, memakai source adapters bersama, berjalan periodik, serta tidak membuka host port.

## 25. Moodle Integration Boundary

Course source memakai approved Moodle adapter dan official web service. Internal connection memakai service DNS `moodle` dengan canonical public Host untuk mencegah redirect ke localhost.

## 26. Portal DB Access Decision

News, Knowledge, dan Announcement dibaca melalui query read-only ke Portal DB sesuai ownership. Moodle DB tidak pernah disentuh worker.

## 27. Search Document Contract

Kontrak engine-neutral berisi `document_id`, `source_type`, `source_id`, plain-text title/summary/body, category, tags, product URL, timestamps, dan generation. Field engine internal tidak diekspos.

## 28. Source Coverage Matrix

Included: published News, exactly published Knowledge revision, active published Announcement, visible non-site Moodle Course. FAQ/Page/Video tidak memiliki domain source canonical terpisah pada baseline ini.

## 29. News Provider

News source memakai tabel `news` Portal dan menghasilkan URL `/news/{slug}`.

## 30. News Publication Security

Hanya `status='published'` dengan `published_at` non-null dan tidak di masa depan yang diindeks. Integration test membuktikan draft dan future publication absent.

## 31. Knowledge Provider

Knowledge source menggabungkan article dengan revision menggunakan `published_revision_no`, bukan current draft revision.

## 32. Knowledge Revision Isolation

Integration test membuktikan token revision terbit ditemukan walau article memiliki current draft lebih baru, sedangkan token draft tidak ditemukan.

## 33. Announcement Decision

Announcement disertakan karena domain canonical tersedia; hanya published, sudah dimulai, belum berakhir, dan published_at valid yang masuk.

## 34. Course Provider

Course source menggunakan `learning.LearningProvider`, menyimpan public safe metadata, dan memberi URL product `/my-learning`.

## 35. Hidden Course Protection

Site course ID 1 dan `visible=false` ditolak lagi di source layer. Unit test course source mengunci perilaku tersebut.

## 36. FAQ Status

SOURCE DOMAIN ABSENT: FAQ home saat ini merupakan presentational content, bukan canonical searchable repository.

## 37. Page Status

SOURCE DOMAIN ABSENT: tidak ada domain Page canonical yang memenuhi aturan publication/index contract.

## 38. Video Status

SOURCE DOMAIN ABSENT: Media Library tidak diperlakukan sebagai published video document mandiri; media hanya publik melalui content eligibility.

## 39. HTML Sanitization

Source mengubah HTML menjadi plain text, decode entity, merapikan whitespace, dan tidak meneruskan markup/script ke index. Test mengunci penghapusan script markup.

## 40. Stable Document IDs

ID stabil memakai `<source>_<source-id>` dengan karakter yang diterima Meilisearch, misalnya `course_19` atau `news_<uuid>`.

## 41. Snapshot/Delta Decision

Baseline memakai source-scoped full snapshot reconciliation karena corpus awal kecil, deterministik, mudah diulang, dan aman untuk recovery.

## 42. Generation Model

Setiap fetch sukses diberi generation baru untuk observability. Reconciliation tetap membandingkan stable document IDs sehingga rebuild tidak menggandakan data.

## 43. Stale Removal

Worker mengambil ID source existing, menunggu upsert sukses, lalu menghapus ID yang tidak ada pada desired snapshot dan menunggu delete task selesai. Integration test real Meilisearch membuktikan stale token hilang.

## 44. Source Failure Isolation

Fetch dilakukan per source; source gagal tidak memanggil `ReplaceSource`, sehingga snapshot terakhir source itu dipertahankan. Unit test mengunci aturan ini.

## 45. Moodle Outage Preservation

Kegagalan adapter Moodle dicatat sebagai source failure tanpa menghapus course documents. Source Portal lain tetap melanjutkan sync.

## 46. Reindex Idempotency

Dua `ReplaceSource` identik pada real Meilisearch menghasilkan tepat satu hit untuk stable document. Test integration lulus.

## 47. Meilisearch Task Completion

Create index, settings update, add documents, delete documents, dan test cleanup menunggu task terminal sukses; status failed menjadi error dan tidak diterjemahkan sebagai sukses.

## 48. Index Settings

Index `teman_belajar_public_v1` memakai primary key `document_id`, searchable attributes yang eksplisit, filterable allowlist, dan sortable timestamps. Versioned index menghindari konflik kontrak primary key lama.

## 49. Query Validation

`q` wajib setelah trim, maksimum 200 karakter, dan control characters ditolak. Unknown query parameters ditolak.

## 50. Filter Security

Public API hanya menerima typed `content_type`, UUID `category_id`, safe `tag`, dan allowlisted `sort`; raw Meilisearch filter/sort syntax tidak diteruskan.

## 51. Pagination

Page minimum 1 dan page_size 1–50; response menyertakan page, page_size, total, dan total_pages.

## 52. Sorting

Pilihan hanya relevance, newest, dan oldest, dipetakan server-side ke engine sort yang diizinkan.

## 53. Search Result DTO

DTO hanya berisi id publik, content_type, title, snippet, URL product, dan tags. Source ID internal, generation, body, ranking score, serta engine metadata tidak diekspos.

## 54. Snippet Safety

Snippet merupakan plain string dan React merendernya sebagai text. Tidak ada `dangerouslySetInnerHTML` pada Search UI.

## 55. Search API

`GET /api/v1/search` bersifat public typed endpoint, memakai `Cache-Control: no-store`, dan mengembalikan data plus pagination.

## 56. Problem Details

Invalid request mengembalikan 422; dependency unavailable mengembalikan sanitized 503; detail internal dan dependency URL tidak bocor.

## 57. Search Engine Security

Meilisearch diproteksi key, host publish hanya loopback, telemetry dimatikan, volume dedicated, dan browser tidak mengakses engine langsung.

## 58. Search Secret Model

Master/admin key hanya ignored local `.env` pada dev dan secret manager pada production. Browser menerima nol key. Production API wajib scoped query key terpisah.

## 59. Dev Search Configuration

Dev memakai `TB_MEILI_ENV=development`, loopback host port, versioned index, strong local key, raw query capture false, dan internal URL `http://search:7700`.

## 60. Production Search Configuration

Production memakai private service URL/TLS sesuai topology, no host admin publish, secret rotation, query/admin key separation, backup source-of-truth, dan rebuild runbook.

## 61. Search Privacy Analytics

Tidak ada analytics raw-query yang ditambahkan. Metrics yang diizinkan terbatas pada aggregate latency/status/source counts tanpa query text atau user identity.

## 62. Raw Query Policy

Raw query logging/capture default dan local governed value adalah `false`; wrapper menolak nilai lain.

## 63. Analytics Retention

Tidak ada raw query retention. Aggregate operational metrics mengikuti retention observability organisasi dan tidak boleh direkonstruksi menjadi user search history.

## 64. Search UI

UI menyediakan heading/result count, labeled searchbox, typed content filters, sort, result cards, pagination, zero/invalid/unavailable states, dan responsive layout.

## 65. Techwind Portal Consistency

Portal memakai chrome, hero, card, section, footer, icon system, mobile navigation, theme toggle, dan back-to-top yang dipetakan dari Techwind ke Teman Belajar semantic tokens.

## 66. Cuba Admin Regression

Admin memakai independent Cuba-derived shell/tokens, sidebar/header/form/card/state patterns dan login surface; tidak mengimpor Techwind globals.

## 67. Light Mode

Browser QA mengonfirmasi Portal `rgb(248, 250, 252)` dan Admin `rgb(246, 247, 251)` dengan `data-theme=light`, konten tampil setelah transition, dan theme control berubah label.

## 68. Dark Mode

Browser QA mengonfirmasi dark Portal dan Admin dengan contrast visual, branded accents, serta theme control pressed state yang benar.

## 69. Mobile

Viewport 390×844 mengonfirmasi Search/mobile navigation dan Admin login tanpa horizontal document overflow. Filter Search memakai horizontal scroller terkontrol.

## 70. Accessibility

Skip links, landmark banner/main/contentinfo, labeled searchbox/select, semantic heading, live result count, accessible theme/menu/back-to-top buttons, focus trap drawer, dan focus restore tersedia.

## 71. XSS Test

Query `<img src=x onerror=alert(1)>` tampil sebagai literal heading text; injected image count 0, dialog false, dan console error/warning kosong.

## 72. Search Down UX

Saat container Search dihentikan, API health/Portal/Admin/Search page tetap 200 dan Search API 503; Search kemudian dipulihkan sehat tanpa volume reset.

## 73. Browser QA

In-app browser memverifikasi Portal home, Search results, light/dark, mobile, Admin login light/dark/mobile, DOM semantics, dan console.

## 74. Browser Security QA

Tidak ada Search/Moodle secret pada DOM yang diamati, XSS payload tidak dieksekusi, dan console menghasilkan 0 error/warning.

## 75. Performance Dataset

Dataset runtime berisi 10 visible Moodle course documents pada Docker Desktop lokal; query `a` menghasilkan 9 hit untuk filter course.

## 76. Performance Method

120 request HTTP sequential, concurrency 1, loopback Portal API menuju container Meilisearch, dengan stopwatch end-to-end dan error count.

## 77. Median

Median aktual: 13.5 ms.

## 78. P95

P95 aktual: 19.5 ms.

## 79. Performance Result

PASS: 120/120 request sukses, error 0, dan P95 jauh di bawah batas material 500 ms untuk baseline lokal.

## 80. Search Runbook

`docs/runbooks/SEARCH-OPERATIONS.md` mendokumentasikan health, source status, rebuild, stale verification, outage, version upgrade, security, rollback, dan escalation.

## 81. TASK-006R Carry-Forward Fixes

Learning proxy tidak lagi log upstream URL/error detail; CourseDetailDrawer membatalkan retry lama, menerapkan focus trap, focus restore, Escape close, dan body-scroll cleanup.

## 82. Portal Verification

`npm run lint`, `npm run typecheck`, local production build, Docker no-cache-equivalent build stage, endpoint verify, dan browser QA lulus pada Next.js 16.3.0/React 19.2.8/Node 22 baseline.

## 83. Admin Verification

Lint, typecheck, production build, Docker build, endpoint verify, serta unauthenticated desktop/mobile light/dark browser QA lulus. Authenticated dashboard browser flow tidak dijalankan karena credential submission tidak diperlukan untuk release gate lokal ini.

## 84. API Verification

`go test ./...`, `go vet ./...`, `go build ./...`, integration DB/Meilisearch, runtime Search, dan health endpoint lulus.

## 85. Search Worker Verification

Logs mengonfirmasi news/knowledge/announcement sukses dengan 0 document pada DB kosong dan course sukses dengan 10 document selama tiga siklus; container healthy.

## 86. OpenAPI Validation

Redocly CLI 2.7.0 built-in recommended rules memvalidasi `openapi/openapi.yaml` tanpa error atau warning setelah Problem ref, operationId, dan license diperbaiki.

## 87. Security Tools

`npm audit --omit=dev` Portal/Admin: 0 vulnerability. `gosec` dengan low-signal G104/G706 dikecualikan: 0 finding; G701 dan G120 memiliki narrow documented suppressions setelah path/request hardening. `govulncheck` dan Trivy tidak tersedia lokal.

## 88. Docker Config

Wrapper `config --quiet` lulus; project/service naming canonical, tanpa `container_name`, tanpa duplicate port, tanpa fallback host port, dan bind loopback.

## 89. Docker Up

Final full `teman-belajar-docker.ps1 up` membangun API, worker, Portal, Admin, Moodle, menjalankan migration exit 0, dan menunggu service health.

## 90. Docker Verify

Wrapper verify menghasilkan HTTP 200 untuk Portal API, Portal Web, Admin Web, Keycloak, Moodle, MinIO, dan Meilisearch.

## 91. Docker Topology

Service keys: web, admin, api, migrate, portal-db, moodle-db, redis, keycloak, minio, moodle, moodle-cron, search, search-worker. Semua long-running service sehat; migrate exit 0.

## 92. Search Health

Meilisearch `/health` tersedia, exact image 1.6.2, loopback 7700, authenticated write required, dan recovery setelah intentional stop lulus.

## 93. Search Worker Health

Worker memiliki healthcheck proses/sync, source-isolated logs, repeated successful cycle, dan mempertahankan index saat source error.

## 94. Moodle Regression

Moodle container/endpoint sehat, official adapter tests lulus, 10 visible course tersinkron, hidden/site course filter tetap aktif, dan tidak ada DB direct query.

## 95. CMS/Knowledge/Media Regression

Go domain/repository/handler tests lulus; Admin list/create/detail surfaces build; multipart request dibatasi 32 MiB; public media eligibility tetap server-side.

## 96. Environment Security Matrix

`docs/governance/ENVIRONMENT-SECURITY-MATRIX.md` menjadi matrix local/test/production untuk URLs, ports, secrets, browser exposure, fail-closed behavior, dan rationale.

## 97. Documentation Consistency Review

AGENTS, repository structure, Docker governance/README, design-system mapping/inventory, handoff index, TASK-007 corrective note, ADR-014, runbook, OpenAPI, dan environment matrix diselaraskan.

## 98. Git Diff Review

`git diff --cached --check` lulus sebelum commit; cache `.tmp`, real `.env`, dan vendor originals tidak masuk. Perubahan mencakup implementation, tests, UI reconciliation, docs, serta explicit repository cleanup.

## 99. Commit SHA(s)

Rewritten implementation commit: `278f8c63edb18d7d6658597060282d860c2c17a7`. Rewritten initial handoff evidence commit: `b308f4c1bda84fc36c44b76c3d488f743359ea24`. Commit evidence final dibuat setelah pembaruan dokumen ini.

## 100. Commit Messages

`feat(platform): secure search and reconcile portal UI`; `docs(handoff): record TASK-007R verification evidence`; dan commit evidence final menggunakan `docs(handoff): close TASK-007R release incident`.

## 101. Main Fast-Forward

APPROVED INCIDENT EXCEPTION: implementation lineage awal adalah fast-forward, tetapi sanitasi ancestor publik secara teknis memerlukan non-fast-forward. Human menyetujui rewrite/force-push tepat tiga branch; push memakai exact `--force-with-lease`, bukan force tanpa lease.

## 102. Final Main SHA

Release baseline setelah rewrite adalah `b308f4c1bda84fc36c44b76c3d488f743359ea24`. SHA final setelah evidence-only commit tidak dapat ditanamkan ke commit itu sendiri dan dibuktikan out-of-band melalui `git rev-parse`, `git ls-remote`, serta final response.

## 103. GitHub Push

PASS: ketiga rewritten lineage dipush dengan exact lease; evidence-only commit berikutnya dipush normal fast-forward ke `main`.

## 104. Remote SHA Verification

PASS untuk rewrite baseline: `git ls-remote` mengembalikan `b308f4c1bda84fc36c44b76c3d488f743359ea24` pada `main`, `0ce0906261202b0c234fef8b14690645346012f3` pada TASK-005, dan `d770e3aa8d11b31c31aa0ea6d0fba865a917ce09` pada light-dark branch. Final evidence commit diverifikasi kembali setelah push.

## 105. Remote Content Verification

PASS: seluruh tiga remote refs menghasilkan `incident_commits=0`; tip `main` juga tidak melacak backup, dump, video, debug scripts, duplicate OpenAPI fragments, atau module worker lama.

## 106. Post-Push Public Security

PASS untuk reachable public refs: post-fetch scan seluruh remote branch menghasilkan 0 incident commit. Credential yang mungkin pernah terekspos tetap wajib dirotasi karena history rewrite tidak membatalkan credential.

## 107. GitHub Actions

PASS: GitHub Actions `CI Baseline` run `32098906026` untuk SHA `b308f4c1bda84fc36c44b76c3d488f743359ea24` selesai sukses. Workflow kemudian diperketat dengan immutable SHA pins untuk action v7, Go version dari `go.mod`, Node 22, real Portal/Admin install-lint-typecheck-build matrix, API build-test-vet, dan Redocly OpenAPI gate; run final diverifikasi out-of-band setelah evidence commit.

## 108. Acceptance Criteria

Architecture, document consistency, UI boundary, repository hygiene, dev security, Search correctness, source isolation, API/UI/privacy/performance/resilience, Portal/Admin/API/OpenAPI/Docker/Moodle/CMS, ADR/runbook/handoff, real commits, remote secret scan, approved incident release, GitHub push, remote SHA verification, post-push security, dan CI: PASS.

## 109. Definition of Done

PASS dengan documented human-approved incident exception untuk non-fast-forward history sanitization. Semua local engineering dan canonical release gates yang dapat diverifikasi telah terpenuhi.

## 110. Full Canonical Source Coverage

Seluruh source domain yang benar-benar canonical pada repository dicakup: News, Knowledge, Announcement, dan Moodle Course. FAQ/Page/Video dicatat explicit sebagai source domain absent, bukan diam-diam diabaikan.

## 111. Technical Debt

Production harus membuat scoped query-only Meilisearch key, menambah automated govulncheck/Trivy/gitleaks CI, menetapkan aggregate metrics retention, menghapus versioned old derived index setelah rollback window, dan menambah authenticated Admin browser E2E dengan secret-safe test identity.

## 112. Human Decisions Required

Tindak lanjut manusia: rotasi/revocation setiap credential yang mungkin pernah hidup di SQL/backups; minta contributor re-clone setelah rewrite; dan putuskan kapan recovery bundle serta `refs/original` lokal aman dihapus.

## 113. TASK-007R Status

PASS — implementation, canonical documentation, approved incident rewrite, three-branch push, remote scan, SHA verification, dan CI baseline selesai.

## 114. TASK-008 Readiness

READY setelah evidence-only commit final dipush dan CI untuk SHA tersebut lulus. TASK-008 tetap belum dimulai oleh pekerjaan ini.
