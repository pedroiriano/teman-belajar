# 10 — Security Architecture

**Product:** Teman Belajar  
**Repository:** `teman-belajar`  
**Product Type:** Enterprise Digital Learning Experience Platform (LXP + LMS)

**Status:** Canonical  
**Version:** 1.0

## 1. Security Objectives

- confidentiality;
- integrity;
- availability;
- accountability;
- least privilege;
- secure change;
- traceability.

## 2. IAM

Keycloak sebagai central identity provider.

Required:
- OIDC;
- MFA sesuai risk/policy;
- password/session policy;
- role/group;
- service accounts;
- client separation;
- admin realm protection.

## 3. Authorization

Portal authorization:
- role + permission/scopes;
- server-side;
- deny by default;
- object-level authorization bila user-specific.

Role baseline:
- Guest
- Learner
- Instructor
- Content Editor
- Reviewer
- Course Manager
- Portal Administrator
- LMS Administrator
- Auditor
- Super Administrator

`LMS Administrator` adalah entitlement eksplisit untuk administrasi Moodle.
Grant hanya berlaku bila claim role tersebut hadir pada client Moodle dan
username sama persis dengan allowlist `MOODLE_FEDERATED_ADMIN_USER`.
`Portal Administrator`/`Super Administrator` tidak otomatis mewariskan Moodle
Site Administrator. Akun recovery Moodle tetap lokal dan terpisah dari SSO.

## 4. Sensitive Actions

Require stronger control:
- role change;
- user disable;
- configuration change;
- publish critical announcement;
- integration credential change;
- audit export;
- destructive admin action.

## 5. Web Controls

- TLS;
- HSTS where appropriate;
- CSP;
- secure cookies;
- CSRF protection according to session architecture;
- XSS output encoding;
- CORS allowlist;
- clickjacking protection;
- request size limits;
- file upload validation;
- rate limiting.

## 6. API Controls

- bearer token validation;
- issuer/audience validation;
- scope/role;
- schema validation;
- anti-abuse limit;
- no verbose sensitive error;
- trace ID;
- audit privileged request.

## 7. Secret Management

Never in repository.
Use:
- secret store;
- encrypted CI secret;
- environment injection;
- rotation procedure.

## 8. Supply Chain

CI:
- SAST;
- dependency scanning;
- secret scanning;
- container scanning;
- SBOM;
- signature/provenance where available.

## 9. File Upload Security

- allowlist type/extension;
- MIME/content verification;
- size limit;
- random object key;
- malware scanning when required;
- never execute uploaded content;
- signed URL for private media.

For the concrete Teman Belajar media policy, limits, rename immutability, authorization, and verification rules, `docs/governance/MEDIA-ASSET-MANAGEMENT.md` is mandatory. The Portal API magic-byte decision is authoritative; client checks never replace it.

## 10. Audit Events

Minimum:
- login success/failure;
- logout;
- role/permission change;
- user lifecycle privileged action;
- content publish/unpublish;
- integration mapping change;
- configuration change;
- security policy change.
- authoring draft create/recover/conflict/discard/finalize (metadata only; never
  draft payload).
- knowledge hierarchy create/update/move/reorder/archive and article placement;
  log actor, action, target, result, and trace context, never article body or
  draft payload.

Knowledge hierarchy authorization is enforced in the Portal API. Hiding Cuba
Admin controls is not authorization. Public responses exclude archived branches
and use database-derived ancestry so a forged client breadcrumb, parent, actor,
or hierarchy path cannot widen visibility. Mutation inputs are bounded;
database constraints independently prevent cycles, excessive depth, sibling
collisions, and hard deletion of referenced nodes. Optimistic versions prevent
silent stale metadata, move, and archive writes.

## 11. Threat Modeling

Setiap feature high-risk wajib mengulas:
- spoofing;
- tampering;
- repudiation;
- information disclosure;
- denial of service;
- elevation of privilege.

## 12. Vulnerability Policy

Production release blocked oleh:
- known critical vulnerability;
- high vulnerability tanpa accepted risk;
- exposed secret;
- failed authz/security regression.

Exception harus documented, owner jelas, expiry jelas.

## 13. Security Testing

- unit authz tests;
- integration authentication tests;
- SAST;
- dependency scan;
- DAST staging;
- penetration test sebelum major launch bila risk warrants;
- periodic access review.
