# TASK-015 Webinar & Live Learning Threat Model

**Status:** Reviewed for non-secret implementation; live provider validation blocked
**Trust boundary:** Portal browser → Portal BFF → Portal API → Moodle Web Service → `mod_zoom` → Zoom

## Assets and Invariants

- Zoom OAuth credentials exist only in Moodle secret storage.
- Moodle owns activity lifecycle, registration, raw attendance, and recording.
- Browser/API receive only sanitized Moodle activity/recording paths, never raw
  Zoom URLs, passcodes, tokens, participant email, or provider payloads.
- Keycloak subject is resolved through the existing mapping; TASK-015 does not
  change login, role mapping, RBAC, or account management.
- Capacity is atomic and fail-closed; waitlist is absent.

## Threats and Controls

| Threat | Control | Verification |
|---|---|---|
| Cross-learner access | Moodle enrolment, visibility, and `mod/zoom:view` checks plus Portal auth middleware | negative handler/adapter tests and live capability fixture gate |
| Capacity race/duplicate retry | Moodle transaction, course-module `FOR UPDATE`, unique registration row, immutable idempotency ledger | Moodle regression test and schema constraints |
| Cross-site mutation | Same-origin BFF check, bearer token server-side, required bounded idempotency key | Portal contract guard and handler tests |
| Brute mutation/retry storm | 20 subject mutations/minute and bounded Moodle timeout | rate-limit tests and metric outcome |
| Credential/passcode leakage | No Zoom SDK/credential in Portal; allowlisted `/mod/zoom/*?id=<number>` URL builder; no raw payload logs | adapter URL negative tests and diff/secret scan |
| Attendance privacy over-retention | Daily 365-day purge, Moodle privacy metadata/export/delete support | scheduled task test and local execution evidence |
| Recording without consent | `viewrecordings=0`, opt-in host setting, only published Moodle recording path returned | configuration evidence and future live fixture |
| Stale/outage shown as success | typed unavailable/configuration errors, no-store responses, explicit UI unavailable state | outage adapter/handler tests |
| Reminder after cancellation | deterministic TASK-021 event IDs and deletion of future deliveries on cancellation | domain reminder tests |
| Open redirect/SSRF | adapter never fetches returned URL and accepts only numeric-ID internal mod_zoom paths | URL allowlist tests |
| Identity boundary regression | no Keycloak/SSO/RBAC files or reconciliation command in scope | scoped diff and governance verification |

## Residual Risks / Activation Blockers

- OAuth scopes, tenant isolation, host license, Zoom capacity, DPA/data region,
  storage, cost cap, and provider-side audit evidence are unknown.
- No live Zoom activity can prove registration propagation, join, report
  freshness, attendance mapping, or recording visibility without credentials.
- Moodle PHPUnit dependencies are not installed in the runtime image; the
  regression test is committed for a supported test image/CI, while local
  schema/task verification provides operational evidence.

These risks require `BLOCKED_CREDENTIALS_AND_EXTERNAL_GATES`; they must not be
converted to PASS by mocking secrets or disabling security gates.
