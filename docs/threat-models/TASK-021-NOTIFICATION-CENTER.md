# TASK-021 Notification Center Threat Model

## Protected Assets

Inbox confidentiality, unread/read integrity, preference integrity, event
idempotency, safe navigation, access tokens, and audit accountability.

## Trust Boundaries and Controls

| Threat | Control | Evidence |
| --- | --- | --- |
| Cross-user inbox access or mutation | OIDC subject derived from middleware; repository predicates include subject and audience | application/handler tests and SQL repository |
| Admin audience privilege escalation | Existing Admin roles checked server-side | negative handler test |
| Duplicate event delivery | unique subject/audience/event constraint and idempotent repository return | migration and service test |
| Open redirect or script URL | audience-specific internal path allowlist | negative deep-link test |
| CSRF through BFF mutation | same-origin validation and server-held token | Admin/Portal notification proxies |
| Preference bypass race | preference check occurs in delivery SQL statement | notification repository |
| Mutation abuse | bounded per-subject rate limiter and `Retry-After` | handler test |
| Information leakage | controlled problem details, no-store, no user identifier in browser API | handlers, proxies, contract guard |
| Provider outage | no external channel enabled; in-app storage is authoritative | governance and runbook |

Residual risk: the in-memory mutation limiter is per API replica. A distributed
limiter may be evaluated only when production scale evidence justifies it; this
does not weaken subject ownership or database constraints.
