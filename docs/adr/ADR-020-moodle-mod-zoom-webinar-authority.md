# ADR-020 — Moodle mod_zoom Webinar Authority

**Status:** Accepted
**Date:** 2026-08-27
**Owner:** TASK-015

## Context

TASK-015 membutuhkan webinar/live learning tanpa membangun conferencing engine.
Teman Belajar sudah menempatkan Moodle sebagai pemilik formal learning dan
memiliki plugin `mod_zoom`. Membuat adapter Zoom langsung di Portal akan
menggandakan credential, meeting lifecycle, attendance, dan recording authority.

Owner menetapkan seluruh webinar TASK-015 wajib berasal dari Moodle dan memakai
Zoom melalui `mod_zoom`.

## Decision

1. Moodle `mod_zoom` adalah authoritative provider adapter untuk TASK-015.
2. Setiap webinar dibuat dan dikelola sebagai aktivitas Moodle. Portal tidak
   membuat, mengubah, atau membatalkan meeting langsung melalui Zoom API.
3. Zoom credential dan Server-to-Server OAuth hanya dikonfigurasi di Moodle.
   Portal dan browser tidak menerima credential, passcode, atau raw provider
   payload.
4. Portal mengakses webinar hanya melalui `MoodleWebinarPort`, existing Moodle
   REST adapter, dan narrow external functions pada `local_temanbelajar` bila
   contract existing belum mencukupi.
5. External functions wajib memvalidasi Moodle context/capability, memakai
   allowlisted canonical fields, dan memanggil public plugin/Moodle APIs. Tidak
   ada query Moodle DB dari Portal dan tidak ada patch Moodle core.
6. Moodle memiliki activity lifecycle, registration projection, raw attendance,
   recording access, grading, dan completion. Portal memiliki discovery/read
   model, orchestration experience, provenance, serta TASK-021 reminders.
7. Portal tidak menerima webhook Zoom. Moodle cron/`mod_zoom` scheduled tasks
   menyinkronkan report; Portal melakukan bounded reconciliation melalui Moodle
   Web Service dan menampilkan explicit stale/degraded state.
8. Kebijakan TASK-015 adalah recording opt-in, attendance retention 365 hari,
   cancellation sampai sesi dimulai, waitlist off untuk v1, timezone
   `Asia/Jakarta`, serta reminder in-app T-24h dan T-1h.
9. Attendance tidak otomatis menghasilkan Moodle completion, certificate, atau
   badge kecuali aturan Moodle terpisah disetujui.

## Consequences

- Moodle tetap menjadi satu-satunya authority untuk live formal learning.
- Portal tidak membutuhkan Zoom SDK, OAuth credential, webhook endpoint, atau
  provider-specific database model.
- Webinar standalone yang tidak memiliki aktivitas Moodle tidak masuk TASK-015.
- Availability dan freshness Portal bergantung pada Moodle, `mod_zoom` tasks,
  serta Zoom; degraded states dan observability menjadi acceptance gate.
- Join dan recording access harus melewati Moodle capability/SSO handoff; Portal
  tidak mempublikasikan raw URL yang dapat mengandung passcode.

## Prerequisites Before Runtime Implementation

- Recovery `mod_zoom` v5.5.0 karena diagnostics sebelumnya menemukan tabel
  `zoom` dan `zoom_meeting_details` tidak tersedia walau plugin berstatus
  up-to-date; recovery membutuhkan backup, rollback plan, dan human approval.
- Konfirmasi Zoom tenant/plan, host/webinar license, cost cap, capacity, storage,
  DPA, data region, subprocessors, serta deletion terms.
- Audit granular OAuth scopes, existing `mod_zoom` external functions,
  scheduled report freshness, dan capability mapping.
- Contract dan negative tests untuk registration, cancellation, attendance,
  recording, stale data, outage, serta revoked credential.

## Implementation Status — 2026-08-27

Recovery lokal `mod_zoom` v5.5.0 telah selesai melalui backup terverifikasi,
official uninstall/reinstall, dan Moodle schema check. Sepuluh tabel plugin
tersedia kembali; dua finding `enrol_apply` yang tidak terkait tetap di luar
scope. Adapter, narrow Web Service, OpenAPI, migration, retention 365 hari,
reminder TASK-021, observability, dan Portal UX yang activation-gated telah
diimplementasikan.

Status tetap `BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES`: OAuth Server-to-Server,
tenant/license/capacity, cost cap, DPA/data region, dan live Zoom/browser E2E
belum dapat diverifikasi tanpa input eksternal. Karena itu menu Webinar tidak
diaktifkan dan capacity default `0` menolak registrasi secara fail-closed.

Dokumen keputusan rinci:
[`TASK-015-WEBINAR-PROVIDER-DECISION-BRIEF.md`](../roadmap/TASK-015-WEBINAR-PROVIDER-DECISION-BRIEF.md).
