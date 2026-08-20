# 09 — Moodle Integration Specification

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

## 1. Baseline

Pada 11 Agustus 2026:
- Moodle 5.2.2 adalah current stable.
- Moodle 5.3 direncanakan sebagai LTS pada 5 Oktober 2026.

Sebelum production go-live lakukan compatibility review terhadap supported LTS/current stable.

## 2. Golden Rules

1. No direct portal SQL to Moodle DB.
2. No Moodle core modification.
3. Gunakan official APIs/web services.
4. Jika core API tidak cukup, gunakan custom plugin dengan extension mechanism resmi.
5. Moodle-specific details terisolasi di adapter/plugin.
6. Integration harus observable dan resilient.

## 3. Integration Components

```mermaid
flowchart LR
  Portal[Go Portal API] --> Adapter[Moodle Adapter]
  Adapter --> WS[Moodle Web Services]
  Moodle[Moodle] --> Plugin[Optional Integration Plugin]
  Plugin --> Event[Portal Internal Event Endpoint]
  Event --> Inbox[(Event Inbox)]
  Inbox --> Worker[Sync Worker]
```

## 4. Identity Mapping

Mapping key:
- Keycloak subject (`sub`)
- portal user ID
- Moodle user ID

Mapping tidak boleh hanya berdasarkan display name.

Email dapat menjadi lookup/provisioning attribute sesuai policy, tetapi immutable identity key tetap disimpan.

## 5. JIT Provisioning

Flow:
1. User authenticated at IdP.
2. Portal obtains identity claim.
3. Moodle access requested.
4. Existing mapping checked.
5. User provision/update performed if policy allows.
6. Mapping persisted.
7. Audit written.
8. User continues to Moodle.

## 6. Read Models

Portal boleh menyimpan snapshot/cache:
- course catalogue;
- course summary;
- learner progress summary.

Untuk statistik, `local_temanbelajar_get_learning_analytics` menerima
`start_date` dan `end_date` inklusif (maksimum 365 hari) dan mengembalikan
agregat tanpa identitas. Pembelajar aktif adalah pengguna aktif dengan role
Moodle `student`, enrolment aktif pada course nyata, dan aktivitas course dalam
periode; guest, site admin, akun deleted/suspended, serta staf non-learner tidak
dihitung. Completion rate adalah completed eligible enrolments sampai akhir
periode dibagi eligible learner-course enrolments pada cohort yang sama. Role
`Portal Administrator` tidak otomatis memberi Moodle Site Administrator.
Observer login `local_temanbelajar` menegakkan batas ini saat runtime. Hanya
username yang sama persis dengan `MOODLE_FEDERATED_ADMIN_USER` **dan** membawa
claim Keycloak khusus `LMS Administrator` dari mapper
`teman-belajar-realm-roles` yang boleh memperoleh Moodle Site Administrator.
`Portal Administrator` maupun `Super Administrator` tidak menyiratkan hak ini.
Login OAuth2 federasi lain yang terpetakan ke Site Administrator atau memperoleh
kapabilitas administratif dari role `Manager` pada system context harus ditolak
dan sesi Moodle yang baru dibuat harus dihancurkan. Administrator pemulihan Moodle
tidak boleh ditautkan ke Keycloak dan tetap menjadi identitas lokal terpisah.
Konfigurasi Docker wajib memberi administrator pemulihan tersebut email yang
berbeda dari semua identitas Keycloak. Rekonsiliasi startup memperbarui profil
pemulihan melalui Moodle user API dan menghapus setiap OAuth2 linked login yang
menempel pada Site Administrator sebelum Apache melayani trafik.
Administrator pemulihan wajib di-resolve dari username lokal yang dikonfigurasi,
bukan dari urutan daftar Site Administrator. Pada lingkungan Docker lokal
terkendali, akun recovery aktif dengan auth `manual` dan maksimal satu akun
federasi yang dikonfigurasi eksplisit adalah satu-satunya Site Administrator;
assignment lain yang drift wajib dilepas. OAuth2 linked login milik akun federasi
yang disetujui harus dipertahankan, sedangkan link pada recovery dan administrator
lain wajib dibersihkan. Rekonsiliasi juga
wajib melepas setiap assignment role ber-archetype `manager` pada system context
dari akun non-recovery tanpa menyentuh role integrasi least-privilege. Jika username recovery
tidak ada, rekonsiliasi membuat ulang akun `manual` melalui Moodle user API
menggunakan password hasil injeksi environment tanpa mencetaknya. Jika email
recovery sudah dimiliki akun lokal `manual` aktif yang masih Site Administrator,
record tersebut wajib diadopsi dengan memulihkan username/password konfigurasi,
bukan membuat duplikat. Pembersihan linked login wajib
memakai ID pada objek pengguna hasil API Moodle, bukan key koleksi. Pada volume
lokal yang dipertahankan, action wrapper `moodle-reconcile` menjalankan upgrade
plugin dan rekonsiliasi idempoten tanpa query database langsung. Jika core
OAuth2 sempat memperbarui profil recovery sebelum observer memblokir login,
observer wajib memulihkan email lokalnya sebelum sesi dihancurkan. Pencabutan
role `LMS Administrator` wajib mencabut grant Site Administrator pada login
federasi berikutnya; perubahan role sensitif harus diikuti terminasi sesi aktif.

Logout yang dimulai dari Portal atau Admin wajib memakai rantai navigasi
top-level: aplikasi pemulai -> `/api/auth/logout-bridge` aplikasi web pasangan
-> Moodle `local/temanbelajar/logout_bridge.php` -> route final aplikasi pemulai
-> Keycloak RP logout. Dengan demikian cookie NextAuth kedua aplikasi dan cookie
Moodle dibersihkan sebagai first-party sebelum sesi Keycloak diakhiri. Setiap
hop bridge wajib ditandatangani HMAC-SHA256 memakai secret khusus minimal 32
byte, memiliki timestamp maksimum 60 detik dan nonce, serta memakai exact
origin/path/return-URL allowlist. Parameter tambahan atau duplikat wajib ditolak.
Ini diperlukan karena browser dapat menolak cookie NextAuth maupun Moodle pada
iframe front-channel lintas-origin. Secret bridge harus berbeda dari secret
NextAuth, client OIDC, dan internal API; nilai nyata hanya berada di environment
yang diabaikan Git. Receiver iframe tetap dipertahankan sebagai defense in depth,
bukan sebagai mekanisme tunggal yang menentukan keberhasilan logout global.
Logout yang dimulai dari Moodle wajib lebih dahulu mengakhiri sesi lokal Moodle,
lalu memakai rantai signed top-level Moodle -> Portal
`/api/auth/moodle-logout-bridge` -> Admin
`/api/auth/moodle-logout-bridge` -> Keycloak RP logout. Portal wajib memvalidasi
signature request Moodle, origin/path Admin, signature hop Admin, dan URL logout
Keycloak yang exact. Admin wajib memvalidasi signature hop-nya dan URL Keycloak
yang exact. Kedua route web membersihkan seluruh chunk cookie NextAuth masing-
masing sebelum HTTP 303; Moodle tidak boleh mengirim token atau identitas pada
query string.

Snapshot harus menyimpan:
- source;
- external ID;
- synced_at;
- version/hash bila tersedia.

## 7. Events

Canonical event examples:
- `learning.user_enrolled`
- `learning.course_completed`
- `learning.activity_completed`
- `learning.badge_awarded`
- `learning.certificate_issued`
- `learning.course_updated`

Event envelope:
- event_id
- event_type
- occurred_at
- source
- subject_id
- payload
- schema_version

## 8. Idempotency

Inbox memiliki unique `event_id`.
Duplicate event = acknowledge safely, do not reapply side effect.

## 9. Timeout & Retry

- timeout explicit;
- retry only safe/idempotent request;
- no retry on validation/authorization failure;
- exponential backoff;
- max attempts bounded;
- dead-letter/manual reconciliation path.

## 10. SSO

Preferred:
- OIDC/OAuth2 integration through central IdP.
- Portal dan Moodle memiliki client/config yang terpisah.
- Logout semantics diuji untuk local session dan IdP session.

Kontrak implementasi:

1. Moodle memakai client `teman-belajar-moodle`; jangan memakai client Portal
   atau Admin dan jangan berbagi client secret.
2. Moodle formal-learning routes memulai OAuth2 secara otomatis melalui
   `local_temanbelajar/login.php`; recovery admin tetap tersedia melalui
   mekanisme administratif terkontrol, bukan tautan publik alternatif.
3. Logout dari Moodle memicu RP-Initiated Logout Keycloak dan kembali ke Portal
   publik setelah sesi IdP berakhir.
4. `local_temanbelajar/federated_logout.php` adalah receiver front-channel yang
   idempotent, memvalidasi issuer, tidak menyimpan token, dan mengirim
   `Cache-Control: no-store`. Setelah validasi `iss` dan `sid`, receiver wajib
   menghapus cookie browser Moodle secara idempotent meskipun cookie
   `SameSite=Lax` tidak dikirim oleh iframe lintas-origin Keycloak; perubahan
   Moodle core tetap dilarang.
5. Portal/Admin/Moodle tetap memiliki cookie lokal masing-masing. “Otomatis
   login” berarti aplikasi melakukan OIDC flow tanpa prompt ketika sesi
   Keycloak aktif; bukan membaca atau menyalin cookie aplikasi lain.

## 11. Plugin Policy

Custom plugin harus:
- memiliki namespace jelas;
- menggunakan Moodle APIs;
- tidak patch core;
- versioned;
- punya upgrade steps;
- punya automated test bila feasible;
- didokumentasikan kompatibilitas Moodle;
- punya minimal privilege.

## 12. Health & Reconciliation

Admin dapat melihat:
- last successful sync;
- failed sync count;
- Moodle latency;
- event backlog;
- mapping failures;
- retry/dead-letter.

Tidak menampilkan access token/secret.

## 13. Degraded Experience

Jika Moodle unavailable:
- public content tersedia;
- course data cached boleh ditampilkan dengan freshness indicator bila sesuai;
- action requiring Moodle dinonaktifkan dengan pesan jelas;
- alert dikirim ke operator.
