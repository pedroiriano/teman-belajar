# TASK-020 Handoff — Platform Configuration

**Status:** DONE

## Delivered

- typed presentation-only schema with immutable `Teman Belajar` identity;
- additive migration 022 and atomic draft/publish/version/rollback repository;
- optimistic concurrency, active image validation, safe link allowlist, cache
  invalidation, and compiled fallback;
- public and exact-Portal-Administrator APIs, central audit, observability, and
  private preview;
- Cuba Admin editor/history and Techwind Portal consumption for identity,
  homepage ordering, navigation, banner, footer/contact, SEO, and active feature
  presentation;
- OpenAPI, ERD, governance, runbook, threat model, and contract/security tests.

## Boundaries

No Keycloak/SSO/RBAC, Moodle, production, secret, arbitrary HTML/CSS/script,
route activation, destructive migration, or new service was introduced. Four
root logo PNG files remain outside task scope.

## Verification

- Go unit/security/repository tests and vet passed for affected packages.
- Admin and Portal lint, typecheck, contract, vendor-foundation, no-orange, and
  reproducible Docker production builds passed.
- OpenAPI validation and protected CI passed, including fresh migrations
  001-022 and disposable repository publish-to-public-to-rollback coverage.
- Desktop and 390px browser checks passed for responsive safe fallback and
  sanitized degraded behavior; no unsafe link, overflow, secret, or console
  error was observed.

## Data and residual environment note

Migration 022 is forward-only and additive. No persistent local data, volume,
or non-disposable fixture was changed. The pre-existing local migration 020
checksum drift was not repaired or adopted; fresh protected CI is the database
migration authority for this delivery.
