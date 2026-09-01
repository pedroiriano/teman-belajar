# TASK-016 Threat Model — Learning Paths

| Threat | Control | Verification |
|---|---|---|
| Draft/version disclosure | Public queries use only the published version pointer | repository/integration tests |
| Broken or hostile graph | Bounded keys/items plus duplicate, orphan and DAG validation | domain negative tests |
| Unauthorized composition/publish | Existing roles, deny-by-default server authorization | service/handler tests |
| Learner progress corruption after revision | Immutable published versions and first-view binding | integration/unit tests |
| Moodle/Portal dependency outage | Per-source degraded state, freshness and provenance | adapter/domain/browser tests |
| TASK-015 false activation | Webinar capacity remains 0; optional unavailable items do not block required completion | contract/unit tests |
| Input/resource exhaustion | Strict JSON, 128 KiB limit, fixed kinds, 50 items, server pagination | handler tests |

Residual risk: live Webinar completion cannot be proven while Zoom remains Basic
without a licensed host/add-on. This is recorded as `IMPLEMENTED_BLOCKED_TASK015`.
