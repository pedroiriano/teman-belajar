# TASK-001 — Portal SSO with Keycloak
**Owner Agent:** Identity/Backend Agent  
**Dependencies:** TASK-000, ADR-005

## Objective
Implementasi login/logout portal melalui OIDC dan current-user identity mapping.

## Acceptance Criteria
- AC-01 Unauthenticated user yang mengakses protected route diarahkan ke IdP.
- AC-02 Callback memverifikasi issuer, audience/state/nonce sesuai library/framework.
- AC-03 Authenticated request `GET /api/v1/me` mengembalikan profile canonical.
- AC-04 Invalid/expired token menghasilkan 401 problem response.
- AC-05 User tanpa permission admin menghasilkan 403 pada admin API.
- AC-06 Login/logout/security failure menghasilkan audit event tanpa token/secret.
- AC-07 Session cookie, bila digunakan, `Secure`, `HttpOnly` dan policy SameSite terdokumentasi.

## Tests
- auth middleware unit/integration;
- invalid token;
- wrong audience;
- unauthorized role;
- logout/session behavior.

## Definition of Done
AC lulus, threat notes ada, OpenAPI security tetap konsisten, tidak ada token di log.
