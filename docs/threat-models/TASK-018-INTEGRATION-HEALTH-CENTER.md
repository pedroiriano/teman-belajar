# TASK-018 Integration Health Center Threat Model

## Assets and trust boundaries

Protected assets are infrastructure topology, credentials, tokens, raw URLs,
dependency responses, stack traces, user identity, and operational control.
The Admin session crosses the Admin-to-Portal-API boundary; only the Portal API
probes dependencies. Workers expose internal-network, GET-only health state.

## Threats and controls

| Threat | Control | Verification |
|---|---|---|
| SSRF/arbitrary probing | Targets and paths are constructed from a fixed startup allowlist; URL userinfo is rejected and redirect targets are never followed; requests with query parameters are rejected | Unsafe-scheme, userinfo, redirect, and query negative tests |
| Unauthorized topology access | Exact Portal Administrator check in the server page and API; hidden navigation for other roles | Handler denial test and browser authorization state |
| Secret/URL/error leakage | Response schema contains bounded error classes and a fixed product-relative correlation path only; bodies/errors are discarded | Data-leak regression tests and contract scan |
| Outage cascade/resource exhaustion | Concurrent bounded probes, per-snapshot timeout, three-failure circuit, no dependency body buffering beyond 4 KiB | Timeout/circuit tests |
| Forged correlation link | Correlation ID syntax is bounded; the UI links only to `/dashboard/statistics#api` | Handler and UI contract tests |
| Unauthorized operations | No mutation route, restart, shell, credential action, or arbitrary parameters; worker health is exact-path GET only | Route/worker negative tests |
| Audit disclosure or omission | Access is audited using bounded action/result/target and sanitized trace ID | Success/denied/rejected audit tests |

## Residual risk

Health signals show availability, not business correctness. Internal DNS/TLS
and dependency authentication policy can yield `down` without proving data
loss. The dashboard must never be used to justify weakening identity, network,
or secret controls.
