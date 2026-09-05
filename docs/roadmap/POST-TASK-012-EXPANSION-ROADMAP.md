# Post-TASK-012 Expansion Roadmap — TASK-013–024

**Status:** Canonical Roadmap
**Baseline:** TASK-012 telah diintegrasikan; keputusan produksi tetap
`PRODUCTION HOLD` sampai seluruh gate manusia TASK-012 diselesaikan.
**Scope:** Pengembangan fitur yang masih berlabel `Segera` dan kapabilitas
pendukung setelah foundation release.

## 1. Aturan Kanonis

1. Nomor task adalah identifier stabil, bukan urutan eksekusi otomatis.
2. Satu branch dan satu PR hanya mengerjakan satu bounded task, kecuali task
   menyatakan integrasi atomik yang tidak dapat dipisahkan.
3. Status awal seluruh TASK-013–024 adalah `PLANNED`.
4. Menu atau kontrol `Segera` tetap non-interaktif sampai route, API, authz,
   state, observability, dokumentasi, dan browser acceptance task terkait telah
   di-merge.
5. Moodle tetap authoritative untuk course, enrolment, assessment, completion,
   certificate, badge, dan formal learning state. Portal memiliki discovery,
   editorial content, experience, orchestration, serta read model berprovenance.
6. Tidak boleh membaca database Moodle secara langsung, memodifikasi Moodle
   core, membuat video-conference engine, atau menambahkan microservice tanpa
   ADR yang disetujui.
7. Secret, credential, environment value, serta konfigurasi Keycloak tidak
   boleh masuk ke UI Platform Configuration.
8. Identity/SSO/account boundary tetap final dan tidak boleh disentuh tanpa
   otorisasi manusia literal `OVERRIDE IDENTITY BOUNDARY`.
9. TASK-024 memverifikasi delta TASK-013–023. Task itu tidak mengulang,
   menutup, atau menurunkan gate produksi TASK-012.

## 2. Registry Fitur

| Task | Fitur | Prioritas | Rancangan inti | Dependensi | Status |
|---|---|---|---|---|---|
| TASK-013 | Pelatihan Penuh / Full Training Programs | P1-High | Katalog program terstruktur, detail, kumpulan course, jadwal, eligibility, CTA enrol/start, dan agregasi progres. Portal mengorkestrasi experience; Moodle memiliki course/enrolment/completion. | TASK-005, TASK-006, TASK-007 | DONE — MERGED via PR #33 |
| TASK-014 | Pembelajaran Singkat / Microlearning | P1-High | Materi editorial 3–15 menit, video/article/quick learning, bookmark, progres ringan, dan related content. Assessment/completion formal tetap Moodle. | Media, Knowledge, Search | DONE — MERGED via PR #35 |
| TASK-015 | Webinar & Live Learning | P1-High | Daftar, detail, jadwal/zona waktu, narasumber, kuota, registrasi, reminder, attendance reference, dan rekaman; Zoom melalui Moodle `mod_zoom` authoritative berdasarkan ADR-020. | TASK-021, recovered `mod_zoom`, Moodle Web Service contract | IMPLEMENTED_NON_SECRET — BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES |
| TASK-016 | Jalur Belajar / Learning Paths | P1-High | Path berurutan berisi course, knowledge, microlearning, webinar, prerequisite, progres, milestone, dan rekomendasi langkah berikut. | TASK-013, TASK-014, TASK-015 | IMPLEMENTED_BLOCKED_TASK015 |
| TASK-017 | FAQ CMS & Help Center | P1-High | Mengganti FAQ hard-coded dengan CMS kategori, pertanyaan, jawaban, urutan, status, SEO, structured data yang valid, Auto-Save, dan Media opsional. | TASK-011A, TASK-011D, TASK-004E | DONE — MERGED via PR #23 |
| TASK-018 | Integration Health Center | P1-High | Dashboard Admin untuk API, Moodle, Keycloak, Meilisearch, Redis, MinIO, worker, database, dan observability; hanya status/freshness/error tersanitasi. | TASK-009, TASK-011, TASK-012 | DONE — MERGED via PR #40 (`a402427`) |
| TASK-019 | Audit Center | P1-High | Audit trail terpusat dengan actor, event, module, target, waktu, IP sesuai kebijakan, result, filter, pagination, export terkontrol, retention, dan privacy. | Existing audit events, TASK-010 | DONE |
| TASK-020 | Platform Configuration & Dynamic Site Management | P1-High | Konfigurasi non-secret untuk identitas situs, homepage sections, navigation, banner, footer, kontak/help, SEO defaults, dan presentasi fitur. | CMS, Media, TASK-011D | DONE |
| TASK-021 | Notification Center | P1-High | Bell Admin/Portal, inbox, unread/read, preference, deep-link, event, dan reminder. In-app lebih dahulu; email melalui adapter bila disetujui. | Event/audit infrastructure | DONE — MERGED via PR #26 (`0a005f9`) |
| TASK-022 | Media Gallery & Video Hub | P1-Medium | Evolusi Media Library menjadi galeri/video publik terkurasi dengan collection, featured, caption, SEO, dan usage; storage mentah tidak dipublikasikan. | TASK-004E, TASK-011D | DONE — MERGED PR #43 (`1c5ab6f`) |
| TASK-023 | Experience Personalization & Recommendation 2.0 | P1-Medium | Untuk Anda, lanjutkan belajar, related knowledge, program/path recommendation berbasis evidence aman tanpa profil sensitif. | TASK-006, TASK-008, TASK-013–016 | DONE — MERGED via PR #47 & PR #48 |
| TASK-024 | Post-Expansion Release Gate | Gate | Verifikasi delta fitur TASK-013–023: migrasi, security, performance, accessibility, SSO regression, rollback, dan observability. | Task ekspansi yang masuk release candidate | DONE — MERGED (PR #49) |

## 3. Urutan Delivery Berbasis Dependensi

| Gelombang | Task | Gate keluar |
|---|---|---|
| A — Platform foundations | TASK-017, TASK-018, TASK-019, TASK-020, TASK-021, TASK-022 | Kontrak, authz, migrasi, observability, serta UI Admin/Portal masing-masing telah lulus |
| B — Learning formats | TASK-013 dan TASK-014 | Ownership Moodle/Portal, discovery, detail, state, serta navigation activation telah lulus |
| C — Live and composition | TASK-015 setelah TASK-021; TASK-016 setelah TASK-013–015 | Reminder/provider contract dan path progress/provenance telah lulus |
| D — Personalization | TASK-023 setelah TASK-013–016 | Evidence, explainability, privacy, fallback, dan opt-out sesuai kebijakan telah lulus |
| E — Expansion gate | TASK-024 | Delta release evidence lengkap; keputusan release tetap milik manusia |

Task dalam satu gelombang dapat berjalan paralel hanya bila branch, migration
number, contract, dan file ownership tidak bertabrakan. Konflik harus
diselesaikan melalui rebase/coordination normal, bukan force-push atau bypass.

## 4. Human Decision Gates

Implementasi berhenti dan meminta keputusan manusia untuk:

- provider webinar/video conference dan kontrak data attendance;
- aktivasi kanal email/SMS/push, sender identity, serta biaya provider;
- retention/export policy Audit Center dan perlakuan IP/personal data;
- konfigurasi apa pun yang berpotensi menjadi secret atau security control;
- perubahan role/capability, identity/SSO/account, public breaking API;
- dependency atau infrastructure service baru, destructive migration, dan
  production deployment;
- kriteria release candidate yang masuk TASK-024.

## 5. Evidence Wajib Per Task

Setiap PR harus menyertakan scope, ownership, threat/abuse cases, migrations,
OpenAPI/ERD bila berubah, unit/integration/contract/E2E yang relevan, negative
authorization, accessibility, responsive light/dark browser QA, observability,
rollback, dan known gaps. Label `Segera` hanya dapat dihapus dalam PR task fitur
yang sama setelah seluruh evidence tersebut tersedia.
