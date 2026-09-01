# TASK-020 Threat Model — Platform Configuration

| Threat | Control |
|---|---|
| Secret/security control stored as content | Typed allowlist, unknown-key rejection, forbidden-value scan, 64 KiB bound |
| XSS/CSS/HTML injection | Plain-text-only fields; markup/control characters rejected; React escaping |
| Open redirect or SSRF | Internal path validation; HTTPS external host allowlist; no arbitrary probe/fetch |
| Draft leaks publicly | Separate Admin-only preview route, exact Portal Administrator gate, no-store/noindex |
| Lost update or partial publish | Optimistic head version, advisory transaction lock, partial unique indexes |
| History tampering | Append-only content revisions; rollback creates a new version |
| Invalid/private Media exposure | Active image UUID validation; public delivery still applies Media eligibility |
| Feature/security activation | Closed active-feature keys; configuration never creates route/capability; `Segera` stays disabled |
| Cache poisoning/outage | Server-compiled typed data, explicit invalidation, safe static fallback |
| Privileged abuse | Deny-by-default authorization plus central audit of views and mutations |

Residual risk: cache invalidation is process-local in v1. The current modular
monolith runs one API instance locally; multi-instance deployment must add a
version-aware shared invalidation signal before horizontal rollout.
