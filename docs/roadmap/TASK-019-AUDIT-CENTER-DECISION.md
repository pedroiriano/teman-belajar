# TASK-019 Audit Center Decision Record

## Status

Approved for local/non-production implementation on 2026-08-31. This record
does not authorize production rollout or identity/RBAC changes.

## Decisions

| Area | Decision |
|---|---|
| Retention | 365 days; bounded daily deletion is the only supported record deletion path. |
| IP/personal data | Never store raw IP; store IPv4 `/24` or IPv6 `/48` only. Actor is the existing immutable subject UUID; no email/name snapshot. |
| Metadata | Server-side allowlist only: filter count, export row count, retention days. No request/response payload. |
| Redaction | Reject/redact credentials, tokens, cookies, authorization data, passcodes, raw URLs, line breaks, and stack traces before persistence and response. |
| Viewer/export role | Existing `Portal Administrator` only, checked again by Portal API. No RBAC or Keycloak change. |
| Export | CSV, required UTC date range of at most 31 days, maximum 10,000 rows, formula-injection neutralization, every attempt audited. |
| Legal/audit access | Uses the existing role and normal Admin authentication; no special identity path in v1. |
| Incident use | Read-only investigation and correlation. Not a SIEM, evidence vault, automated enforcement engine, or operational control plane. |

## Consequences

Audit rows cannot be edited through API/UI. Cursor pagination is ordered by
`occurred_at DESC, id DESC`. Retention deletion is server-scheduled, batched,
and emits no row identifiers to logs. Exports and views create additional
append-only audit events. Production activation remains gated by verification.
