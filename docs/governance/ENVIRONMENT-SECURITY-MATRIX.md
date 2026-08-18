# Environment Security Matrix

**Status:** Canonical
**Last reviewed:** 2026-08-18
**Applies to:** Teman Belajar local, test, staging, and production runtimes

## Policy

- Committed `.env.example` files contain placeholders only. Real local values belong only in ignored `infrastructure/docker/.env`.
- `NEXT_PUBLIC_*` is prohibited for server credentials.
- Local Docker host publications bind to loopback. Production databases, Redis, MinIO administration, Meilisearch administration, Moodle internal endpoints, and Keycloak administration must use private networks.
- Insecure overrides fail closed and are enabled only by explicit environment configuration.
- Production secret injection is supplied by the deployment platform's encrypted secret store. Building a secret manager into application code is out of scope.

## Matrix

| Setting | Local development | Automated test | Staging/production | Secret | Browser-visible | Default / fail-closed rule | Security rationale |
|---|---|---|---|---:|---:|---|---|
| Keycloak issuer | Loopback hostname from `.env` | Test issuer | HTTPS trusted issuer | No | Issuer metadata only | Missing value stops API/web auth configuration | Prevent issuer substitution |
| Moodle public URL | Loopback URL from `.env` | Test URL | HTTPS public LMS URL | No | Yes | Must match declared host port locally | Prevent broken redirects and mixed origins |
| Moodle internal URL | `http://moodle` service DNS | Stub/container DNS | Private HTTPS/service DNS | No | No | Invalid URL stops API/worker | Isolate server-to-server integration |
| Moodle WS token | Ignored `.env` | Ephemeral fixture | Encrypted secret injection | Yes | Never | Missing token stops API/worker | Moodle authority credential |
| Meilisearch URL | `http://search:7700` | Safe test index | Private service URL | No | Never | Invalid URL stops API/worker | Prevent arbitrary dependency routing |
| Meilisearch master key | Ignored `.env`, strong non-placeholder | Ephemeral test key | Encrypted admin secret, worker only | Yes | Never | Missing key stops Search/worker configuration | Prevent anonymous index writes |
| Meilisearch query key | Server-only; local baseline remains behind Go API | Ephemeral | Scoped query-only key | Yes | Never | Never fall back to anonymous access | Least privilege for queries |
| NextAuth secrets | Separate Portal/Admin ignored values | Ephemeral values | Separate encrypted values | Yes | Never | Missing value stops web runtime | Cookie/session integrity |
| Portal/Keycloak/Moodle DB credentials | Separate ignored values | Ephemeral database | Separate secret-store entries | Yes | Never | Missing values stop affected service | Ownership and blast-radius isolation |
| MinIO credentials | Ignored `.env` | Ephemeral | Scoped service credentials in secret store | Yes | Never | Missing values stop API/MinIO | Object-storage confidentiality |
| Raw search-query capture | `false` | `false` | `false` unless an approved privacy design exists | Potentially sensitive | No | Any local value other than `false` is rejected | Queries can contain PII or confidential terms |
| Moodle insecure OAuth flag | Explicit `true` only if plain-HTTP local OIDC requires it | Test-specific | `false` | No | No | Boolean; production is always false | Prevent insecure token transport |
| Debug mode | Off | Test-scoped | Off | No | No | No runtime fallback enables it | Avoid sensitive error disclosure |
| Cookie secure flag | Development exception on HTTP loopback | Test-specific | Secure + HttpOnly + SameSite policy | No | Cookie metadata | Production HTTPS requires secure cookies | Session confidentiality |
| CORS | Same-origin/BFF baseline | Explicit test origins | Strict allowlist | No | Policy | No wildcard credentialed CORS | Prevent cross-origin credential abuse |
| HTTPS | Loopback HTTP exception | Internal test | Required at public ingress | No | Yes | No production HTTP exception | Transport confidentiality/integrity |

## Production readiness gaps

The repository defines local Compose, not a production deployment. Before production release, the deployment owner must provide:

1. encrypted secret injection and rotation evidence;
2. private network policies for data/search/admin endpoints;
3. a query-only Meilisearch key for the Go API and admin key restricted to the worker;
4. TLS termination, HSTS, secure-cookie, and CORS evidence;
5. backup/restore and incident procedures;
6. log/metric retention with raw search queries disabled.
