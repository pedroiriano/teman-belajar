# TASK-019 — Audit Center

**Status:** PLANNED  
**Owner Agent:** Backend/Frontend/Security/Privacy/QA  
**Feature:** F-ADM-003  
**Dependencies:** Existing audit events, TASK-010

## Objective

Menyediakan pencarian audit trail terpusat yang aman, berprovenance, dan sesuai
kebijakan retention/privacy.

## Human Decision Before Implementation

Setujui retention, perlakuan IP/personal data, export roles/format/limit,
redaction, legal/audit access, dan incident-use policy.

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
