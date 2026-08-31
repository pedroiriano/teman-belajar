# TASK-019 Audit Center Threat Model

| Threat | Control |
|---|---|
| Unauthorized disclosure/enumeration | Exact Portal Administrator authorization in server UI and API; deny by default; attempts audited. |
| Secret, payload, URL, or stack-trace leakage | Storage and response sanitizer, minimum metadata allowlist, bounded fields, generic dependency errors. |
| Raw IP/personal data overcollection | IPv4 `/24` or IPv6 `/48` masking before persistence; actor subject UUID only. |
| Unbounded query/denial of service | Exact filters, cursor pagination, page cap 100, export range 31 days and 10,000-row hard limit, request timeouts. |
| CSV formula injection | CR/LF removal and formula-leading cell neutralization before CSV output. |
| Audit tampering | No update or UI delete operation; retention is the sole bounded deletion port. |
| Cross-tenant or identity-boundary change | No new identity/tenant capability; existing Portal Administrator role only. |
| Sensitive observability labels | Metrics contain bounded operation/result labels only, never actors, filters, targets, or correlation IDs. |

Residual risks: a privileged Portal Administrator can view subject UUIDs and
business target identifiers, and CSV can leave the platform after download.
Operational policy and endpoint security remain required; v1 is not a legal
evidence vault or SIEM.
