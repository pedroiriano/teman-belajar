# TASK-019 — Audit Center

**Status:** DONE
**Owner Agent:** Backend/Frontend/Security/Privacy/QA
**Feature:** F-ADM-003
**Dependencies:** Existing audit events, TASK-010

## Objective

Menyediakan pencarian audit trail terpusat yang aman, berprovenance, dan sesuai
kebijakan retention/privacy.

## Human Decision Before Implementation

Setujui retention, perlakuan IP/personal data, export roles/format/limit,
redaction, legal/audit access, dan incident-use policy.

**Approved locally:** 365-day retention; masked IP only; allowlisted minimum
metadata; server-side sensitive-field redaction; Portal Administrator-only CSV
export with required date range and a 10,000-row limit; existing role only; v1
is read-only investigation rather than SIEM or automated enforcement. See the
TASK-019 decision record.

## In Scope

- Actor/event/module/target/timestamp/result/correlation, approved IP handling,
  filter, cursor pagination, detail, controlled export, access auditing.

## Out of Scope

- Mengedit/menghapus event melalui UI, unrestricted export, secret/payload dump,
  cross-tenant leakage, SIEM replacement, atau identity changes.

## Acceptance Criteria

- AC-01 Audit records immutable dari UI dan filter/pagination deterministic.
- AC-02 Redaction/retention/export dipaksakan server-side.
- AC-03 Viewer/export authorization deny-by-default dan ikut diaudit.
- AC-04 Large query dibatasi, terobservasi, dan tidak blocking tanpa kontrol.
- AC-05 Cuba UI state/accessibility/no-orange dan browser QA lulus.

## Required Tests

- [ ] query/redaction/retention unit and integration
- [ ] authz/enumeration/export/data-leak negative tests
- [ ] filter/pagination/export E2E and accessibility

## Documentation Impact

- [ ] privacy/security/runbook/OpenAPI/ERD/migration/handoff

## Definition of Done

Keputusan manusia tercatat dan seluruh AC/security/privacy evidence lulus.

## Local implementation note

Source, additive migration, Admin UI, OpenAPI, observability, privacy/security
documentation, runbook, and handoff are complete. Targeted automation,
disposable migration/repository integration, authorized/non-admin browser,
desktop/mobile, responsive, accessibility, no-orange, and CSV gates passed.
