# ADR-015 — Deterministic Engagement Recommendation Rules

**Status:** Accepted

**Date:** 2026-08-18
**Scope:** TASK-008 learner engagement recommendations

## Context

Teman Belajar needs useful, explainable discovery based on learner-controlled
engagement signals. TASK-008 does not authorize an LLM, embedding/vector store,
collaborative model, sensitive profiling, or a new service.

## Decision

Recommendations are a computed Portal read model. The Engagement application
service reads the current learner's bookmarks, recent views, and ratings from
Portal PostgreSQL, asks the existing Search application boundary for typed
public candidates, revalidates every candidate through the authoritative target
resolver, and applies deterministic weights:

| Signal | Same content type | Same category |
|---|---:|---:|
| Bookmark | 20 | 40 |
| Recent view | 12 | 25 |
| Rating 4–5 | `(25 + rating × 5) / 2` | `25 + rating × 5` |
| Published within 30 days | +10 | +10 |

Ties use published timestamp descending, then target type and target ID
ascending. Exact seed items and inaccessible/archived targets are excluded.
Controlled reason codes are `same_category`, `recent_interest`,
`popular_rating`, and `fallback_recent`. Numeric scores remain internal.

With no personal signals, Search returns recent public Knowledge candidates and
the response sets `personalized=false`; the UI uses neutral wording. No
recommendation table is created.

## Privacy and Security

- Actor identity is validated OIDC `sub`, stored server-side only.
- Email, roles, demographics, IP, raw query history, and anonymous fingerprints
  are not signals.
- Search is candidate discovery, never target authority.
- Each candidate is re-resolved against Portal Knowledge publication state.
- Personal endpoints are `no-store` and never expose subject/user identities.

## Failure and Evolution

Search outage returns a bounded recommendation unavailable response; Bookmark,
Rating, Recent View, Knowledge, and the rest of Portal continue working. Moving
to AI/vector/collaborative recommendation or adding a new target type requires a
new product decision, privacy review, contract/migration work, and superseding ADR.
