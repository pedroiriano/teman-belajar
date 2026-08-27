# TASK-015 Webinar Provider Decision Brief

**Status:** APPROVED_PROVIDER_AND_PRODUCT_POLICY — BLOCKED_PREREQUISITES
**Tanggal:** 2026-08-27
**Scope:** Keputusan provider, keamanan, biaya, ownership data, dan boundary
adapter sebelum implementasi TASK-015.
**Decision record:** ADR-020
**Non-goal:** Dokumen ini tidak mengaktifkan menu `Webinar` dan tidak
mengizinkan implementasi runtime sebelum prerequisite teknis, lisensi, dan
compliance lulus.

## 1. Executive Decision

Keputusan manusia menetapkan **Zoom melalui aktivitas Moodle `mod_zoom` sebagai
authoritative provider adapter**. Seluruh webinar TASK-015 wajib berasal dari
Moodle; Portal tidak membuat meeting langsung ke Zoom dan tidak menyimpan
credential Zoom.

Moodle memiliki authoring aktivitas, jadwal provider, registration projection,
raw attendance, grading/completion, dan recording access. Portal memiliki
discovery experience, read model berprovenance, orchestration BFF, serta
reminder TASK-021. Zoom memiliki live room dan artefak konferensi.

Teman Belajar tidak membangun engine konferensi, tidak menambah microservice,
tidak mengubah Keycloak/SSO/RBAC, tidak memodifikasi Moodle core, dan tidak
membaca database Moodle secara langsung. Integrasi Portal hanya menggunakan
Moodle Web Service melalui adapter yang sudah disetujui.

Kebijakan produk juga disetujui: recording opt-in, attendance retention 365
hari, cancellation sampai sesi dimulai, waitlist off untuk v1, timezone
`Asia/Jakarta`, serta reminder in-app T-24h dan T-1h.

Implementasi masih diblokir sampai schema `mod_zoom` pulih dan terverifikasi,
tenant/plan dan biaya dikonfirmasi, DPA/data region diterima, serta OAuth scopes
dan peak capacity disetujui.

Audit read-only dan recovery plan tersedia di
[`MOD-ZOOM-SCHEMA-RECOVERY.md`](../runbooks/MOD-ZOOM-SCHEMA-RECOVERY.md).
Status recovery adalah `PLAN READY — RECOVERY NOT AUTHORIZED`.

## 2. Opsi Provider dan Biaya

Harga berikut adalah snapshot publik untuk perbandingan, bukan quotation.
Pajak, wilayah Indonesia, kurs, diskon, minimum seat, webinar add-on, kapasitas,
storage, egress, dan support dapat mengubah total biaya. Procurement wajib
meminta quotation final sebelum kontrak.

| Opsi | Status | Biaya indikatif | Alasan keputusan |
|---|---|---|---|
| Moodle `mod_zoom` → Zoom | **Dipilih** | Incremental dapat rendah bila tenant dan host/webinar license sudah ada; tetap hitung host license, webinar/capacity add-on, cloud recording storage, egress, dan support | Mempertahankan Moodle sebagai pemilik formal learning dan menghindari credential serta provider integration ganda di Portal |
| Portal → Zoom langsung | Ditolak untuk TASK-015 | Paket Pro/Business, webinar add-on, storage, dan support | Membuat dua authority, credential boundary tambahan, serta risiko meeting/attendance tidak sinkron dengan Moodle |
| Microsoft Teams | Tidak dipilih | Teams/M365 plan yang mendukung webinar | Tidak sesuai keputusan seluruh webinar berasal dari Moodle `mod_zoom` |
| Google Meet | Tidak dipilih | Workspace Business Plus/Enterprise atau plan terkait | Tidak sesuai keputusan provider dan menambah Workspace/Drive/Pub/Sub boundary |
| BigBlueButton | Tidak dipilih | Lisensi inti open source, tetapi TCO operasi tinggi | Memerlukan runtime/ADR baru dan tidak sesuai keputusan Zoom melalui Moodle |

### 2.1 Model evaluasi biaya yang wajib diisi

Procurement/owner harus mengisi untuk Zoom tenant yang dipakai Moodle:

`TCO tahunan = lisensi host + webinar/capacity add-on + storage/egress + support
+ operasi/on-call + legal/compliance review`.

Keputusan tidak boleh hanya membandingkan harga per-seat. Cantumkan jumlah
organizer, peak concurrent attendees, jumlah/durasi sesi, retention recording,
recovery objective, dan kebutuhan support.

## 3. Ownership dan Kontrak Data

| Data/aksi | System of record | Aturan |
|---|---|---|
| Aktivitas, jadwal, speaker/host, meeting/webinar reference | Moodle `mod_zoom` | Setiap webinar dibuat dan diubah dari Moodle; Portal hanya memproyeksikan field allowlist |
| Registrasi dan pembatalan | Moodle melalui narrow Web Service | Portal mengorkestrasi UX; Moodle menegakkan akses dan memproyeksikan registrasi ke Zoom secara idempotent |
| Live room dan runtime meeting | Zoom melalui `mod_zoom` | Portal menyimpan Moodle course-module reference dan sanitized sync state, bukan credential/passcode |
| Raw participant/session events | Zoom → Moodle `mod_zoom` | Scheduled task plugin mengambil report; Portal tidak menerima webhook Zoom langsung |
| Derived attendance reference | Portal, bersumber dari Moodle | Minimal, berprovenance, authorized, retention tepat 365 hari |
| Course, enrolment, assessment, completion, certificate | Moodle | Attendance webinar tidak otomatis menjadi completion kecuali aturan Moodle yang disetujui secara terpisah |
| Reminder intent/in-app notification | TASK-021 | Event `learning.reminder`; kanal eksternal tetap tidak aktif |
| Recording binary dan transcript | Zoom, diakses melalui Moodle | Recording opt-in; Portal hanya menampilkan metadata/handoff terotorisasi dan tidak menyalin ke MinIO |

Kontrak derived attendance minimum:

- `webinar_session_id`, Moodle `course_module_id`, dan opaque Zoom session ref;
- immutable Keycloak `subject` sebagai identitas Portal;
- opaque `provider_participant_ref`, bukan email sebagai primary key;
- `first_joined_at`, `last_left_at`, dan `attended_seconds`;
- `source`, `observed_at`, `sync_status`, dan provenance/version;
- tidak menyimpan IP, lokasi, device fingerprint, chat, transcript, atau raw
  webhook body sebagai attendance record.

Zoom account/member ID hanyalah external reference di Moodle. Ia tidak boleh
mengubah flow login, role mapping, atau account management Teman Belajar.

## 4. Rancangan Adapter

```text
Portal Web -> Next.js BFF -> Portal API -> Webinar Application Service
                                          |-> Portal read model/cache
                                          |-> MoodleWebinar port
                                          |     -> existing Moodle REST adapter
                                          |     -> local_temanbelajar Web Service
                                          |     -> mod_zoom -> Zoom API
                                          `-> TASK-021 Notification Service

Zoom report/recording -> mod_zoom scheduled tasks -> Moodle
Portal reconciliation ---------------------------> Moodle Web Service
```

Implementasi berada pada modular monolith dan runtime worker yang sudah
disetujui. Adapter dilarang membuka microservice baru. Polling reconciliation,
bila diperlukan, berjalan sebagai job pada worker yang sudah ada.

### 4.1 Moodle webinar port

Port aplikasi harus kecil, read/projection-first, dan tidak meniru Zoom SDK.
Authoring meeting tetap dilakukan di Moodle:

```go
type MoodleWebinarPort interface {
	ListSessions(ctx context.Context, cursor string) (SessionPage, error)
	GetSession(ctx context.Context, courseModuleID int64) (Session, error)
	Register(ctx context.Context, command RegistrationCommand) (Registration, error)
	CancelRegistration(ctx context.Context, command CancellationCommand) error
	FetchAttendance(ctx context.Context, courseModuleID int64) (AttendanceSnapshot, error)
	ListRecordings(ctx context.Context, courseModuleID int64) ([]RecordingMetadata, error)
}
```

Fungsi narrow Web Service ditambahkan pada `local_temanbelajar`, memanggil API
publik/capability `mod_zoom`, memvalidasi context serta capability, dan hanya
mengembalikan canonical allowlisted fields. Ia tidak memodifikasi Moodle core.
Existing `mod_zoom` external functions harus diaudit dahulu; fungsi baru hanya
menutup contract gap yang terbukti.

Setiap mutasi memakai idempotency key Teman Belajar. Simpan external ID stabil,
provider revision/event time, last-sync time, dan sanitized error category.
Jangan menyimpan access token, refresh token, passcode, raw SDK response, atau
secret di database domain, URL, client bundle, audit payload, maupun log.

### 4.2 Scheduled report dan reconciliation

- Moodle cron dan scheduled task `mod_zoom` mengambil meeting reports dari Zoom;
- Portal tidak membuka webhook Zoom dan tidak memiliki Zoom OAuth credential;
- Portal menyimpan `source_updated_at`, `synced_at`, freshness, dan sanitized
  failure category pada read model;
- reconciliation memakai Moodle Web Service dengan timeout, pagination,
  exponential backoff, jitter, dan bounded retry;
- duplicate snapshot diproses idempotent; snapshot lebih lama tidak menimpa
  provenance yang lebih baru;
- stale/unavailable Moodle atau `mod_zoom` ditampilkan sebagai degraded state,
  bukan attendance kosong atau sukses palsu.

## 5. Security dan Privacy Risk Register

| Risiko | Dampak | Kontrol wajib |
|---|---|---|
| Credential/token bocor | Provider account takeover | Secret store server-side, least scope, rotasi, redaction, tidak pernah ke browser |
| Zoom Server-to-Server OAuth terlalu luas | Akses account-level berlebihan | Credential hanya di Moodle, app terpisah per instalasi, granular least scopes, rotasi |
| Moodle Web Service token terlalu luas | Akses course/user berlebihan | Restricted integration user/service, fungsi allowlist, capability/context validation |
| SSRF/open redirect/malicious URL | Internal network access atau credential theft | Tidak fetch URL arbitrer; allowlist HTTPS host provider; redirect dan join URL dibentuk/dites server-side |
| PII attendance berlebih | Privacy breach | Data minimization, field allowlist, authz server-side, retention/purge, no raw payload/log |
| Attendance salah dipetakan | Learner/provenance salah | Resolve immutable Keycloak subject ke Moodle user ID; email/nama bukan primary identity |
| Scheduled report stale/gagal | Attendance tampak kosong atau salah | Monitor task freshness/error, explicit stale state, reconciliation dan alert |
| Capacity race/retry | Overbooking atau duplicate registration | Moodle-side transaction/capability, idempotency key, contract/concurrency test |
| Moodle/Zoom outage atau 429 | Session tidak sinkron | Timeout, bounded retry/backoff, degraded state, audit dan reconciliation |
| Schema `mod_zoom` drift | Runtime gagal dan data tidak authoritative | Approved recovery plan, backup, Moodle schema verification, plugin tests sebelum coding Portal |
| Recording terbuka | Kebocoran suara/video/transcript | Recording default-off, consent/notice, review sebelum publish, permission check, no token/passcode in URL |
| Time-zone/DST error | Jadwal/reminder salah | Simpan UTC instant + IANA zone; validasi DST; render menurut viewer zone |
| Identity boundary drift | Regresi SSO/RBAC | Keycloak subject tetap identitas Portal; external mapping bukan login/role |
| Attendance dianggap completion | Formal learning salah | Provenance eksplisit; Moodle tetap authoritative; tidak ada automatic completion claim |

## 6. Kebijakan Default yang Direkomendasikan

Kebijakan berikut telah disetujui untuk implementasi TASK-015:

1. **Recording:** opt-in per sesi dengan notice/consent dan
   review sebelum link dipublikasikan.
2. **Retention attendance:** tepat 365 hari, lalu purge.
3. **Time zone:** simpan UTC + IANA timezone; default authoring
   `Asia/Jakarta`, tetapi organizer wajib mengonfirmasi zone sesi.
4. **Cancellation:** peserta dapat membatalkan hingga waktu mulai sesi.
5. **Capacity:** Moodle authoritative melalui narrow Web Service. Waitlist off
   untuk v1.
6. **Reminder:** in-app melalui TASK-021 pada T-24 jam dan T-1 jam. Email,
   SMS, push, dan sender identity tetap nonaktif.
7. **Attendance:** attendance tidak otomatis menghasilkan Moodle completion,
   certificate, atau badge.
8. **Menu:** tetap `Segera` sampai authorization, degraded states, contract
   tests, dan browser E2E lulus pada final SHA.

## 7. Human Decision Gates

Keputusan produk yang sudah disetujui:

- [x] Zoom melalui Moodle `mod_zoom`; seluruh webinar berasal dari Moodle;
- [x] recording opt-in;
- [x] attendance retention 365 hari;
- [x] cancellation sampai sesi dimulai;
- [x] waitlist off untuk v1;
- [x] timezone `Asia/Jakarta` dengan UTC instant + IANA zone;
- [x] reminder in-app T-24h dan T-1h.

Implementasi masih menunggu prerequisite berikut:

- [ ] persetujuan dan eksekusi recovery plan `mod_zoom` v5.5.0;
- [ ] bukti tenant/lisensi yang tersedia, quotation, cost cap, dan owner biaya;
- [ ] DPA, data residency, subprocessors, deletion/return, dan breach terms;
- [ ] dedicated Zoom organizer/account dan approved granular OAuth scopes;
- [ ] peak capacity, durasi/frekuensi sesi, recording/storage requirement;

Jawaban ringkas yang direkomendasikan untuk membuka implementasi:

> Konfirmasi Zoom tenant/plan **[nama]**, cost cap **[nilai/periode]**, data
> region **[region]**, organizer/account owner **[owner]**, peak capacity
> **[peserta]**, dan recording storage **[kuota/retention]**; setujui recovery
> `mod_zoom` dengan backup serta rollback plan.

Setelah keputusan lengkap, buat branch implementasi baru dari `main`; jangan
melanjutkan implementasi pada branch decision brief ini. Provider boundary
telah dicatat dalam ADR-020.

## 8. Acceptance dan Verification Strategy

Minimum gate implementasi kelak:

- unit test domain untuk capacity, cancellation, state transition, timezone,
  idempotency, dan attendance derivation;
- Moodle webinar adapter contract test dengan fixture tersanitasi, capability,
  timeout, 429, stale snapshot, duplicate, dan revoked token;
- integration test narrow Moodle Web Service, `mod_zoom` scheduled report,
  registration/cancellation, dan reconciliation;
- authorization/rate-limit/negative tests tanpa melemahkan identity boundary;
- TASK-021 reminder contract test tanpa kanal eksternal;
- browser E2E registrasi, cancellation, full, offline/degraded, recording
  visibility, accessibility, dan responsive behavior;
- security review untuk secret redaction, URL allowlist, log/telemetry, DPA,
  retention job, dan provider scope.

## 9. Sumber Resmi

- Moodle `mod_zoom` plugin dan source documentation:
  <https://moodle.org/plugins/mod_zoom>,
  <https://github.com/jrchamp/moodle-mod_zoom>

- Google Meet REST API overview dan artifacts:
  <https://developers.google.com/workspace/meet/api/guides/overview>,
  <https://developers.google.com/workspace/meet/api/guides/artifacts>
- Google Workspace Events untuk Meet:
  <https://developers.google.com/workspace/events/guides/events-meet>
- Google Workspace pricing snapshot regional:
  <https://workspace.google.com/pricing?hl=en_eu>
- Microsoft Teams plan comparison:
  <https://www.microsoft.com/en-US/microsoft-teams/compare-microsoft-teams-business-options>
- Microsoft Graph attendance report, recording/transcript notifications, dan
  application access policy:
  <https://learn.microsoft.com/en-us/graph/api/resources/meetingattendancereport>,
  <https://learn.microsoft.com/en-us/graph/teams-changenotifications-callrecording-and-calltranscript>,
  <https://learn.microsoft.com/en-us/graph/cloud-communication-online-meeting-application-access-policy>
- Zoom API, authentication, meetings, dan webhooks:
  <https://developers.zoom.us/docs/api/>,
  <https://developers.zoom.us/docs/api/authentication/>,
  <https://developers.zoom.us/docs/api/meetings/>,
  <https://developers.zoom.us/docs/api/webhooks/>
- Zoom pricing dan DPA:
  <https://zoom.us/pricing>,
  <https://media.zoom.com/download/assets/zoom-global-dpa.pdf/dd327ebea27e11efb613d6ba63ed4cee>
- BigBlueButton API, webhook, deployment requirements, dan Moodle plugin:
  <https://docs.bigbluebutton.org/development/api/>,
  <https://docs.bigbluebutton.org/4.0/development/webhooks/>,
  <https://docs.bigbluebutton.org/administration/install/>,
  <https://moodle.org/plugins/mod_bigbluebuttonbn>
