# TASK-000A — UI Vendor Intake & Design-System Baseline
**Owner Agent:** Frontend/UI Architecture Agent  
**Dependencies:** None

## Objective

Memeriksa source Techwind dan Cuba yang tersedia secara lokal, membuat inventory komponen/dependency, dan memetakan pattern yang akan diadaptasi tanpa memodifikasi vendor original.

## Preconditions

User telah meletakkan:
- Techwind di `vendor/ui-templates/techwind/ORIGINAL/`
- Cuba di `vendor/ui-templates/cuba/ORIGINAL/`

Jika source belum tersedia, task hanya boleh menyiapkan inventory template dan melaporkan bahwa inspection belum dapat diselesaikan.

## In Scope

- detect framework/version/dependency kedua vendor;
- inventory page/component yang relevan;
- identifikasi Tailwind config/plugin;
- identifikasi font/icon/chart/library;
- update `docs/design-system/COMPONENT-INVENTORY.md`;
- rekomendasi minimum dependencies;
- identify license-sensitive artifacts that must not be committed;
- flag incompatibility with Next.js/React target if any.

## Out of Scope

- copy seluruh vendor ke apps;
- rewrite aplikasi;
- redesign;
- Moodle/backend work.

## Acceptance Criteria

- AC-01 Tidak ada file dalam `vendor/**/ORIGINAL/` yang dimodifikasi.
- AC-02 Techwind stack/dependency inventory terdokumentasi.
- AC-03 Cuba stack/dependency inventory terdokumentasi.
- AC-04 Mapping vendor pattern → Teman Belajar feature dibuat.
- AC-05 Konflik Tailwind/plugin/dependency dicatat.
- AC-06 List asset/page yang tidak diperlukan dibuat.
- AC-07 Tidak ada purchase code/license credential yang masuk Git.
- AC-08 Portal/Admin theme boundary tetap terpisah.

## Definition of Done

Inventory, risk, dependency recommendation, dan component mapping selesai serta siap menjadi input TASK-000 dan task UI berikutnya.
