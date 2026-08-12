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
