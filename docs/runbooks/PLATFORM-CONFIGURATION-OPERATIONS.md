# Platform Configuration Operations

## Safe authoring

1. Sign in as Portal Administrator and open **Konfigurasi Platform**.
2. Change only presentation fields. Select images through Pustaka Media.
3. Save a draft. A `409` means another version won; reload and reconcile.
4. Open the private preview. It must carry `private, no-store` and noindex.
5. Publish the current draft. Confirm the Portal receives the new version and
   inactive `Segera` routes remain inactive.

## Rollback

Choose a historical version and use **Rollback sebagai versi baru**. The API
must create and publish a new version whose `based_on_version` points to the
source. Never edit/delete historical rows or rewrite migration history.

## Degraded state

If PostgreSQL/config cache is unavailable, public reads must use the compiled
fallback while Admin mutations return a sanitized `503`. Do not bypass
validation or publish a raw JSON fallback. After recovery, verify the public
version, cache refresh, Audit Center events, and Media references.

## Verification

- `go test ./internal/domain/platformconfig ./internal/application/platformconfig ./internal/repository/postgres ./internal/transport/http/handler`
- `go vet` for the same affected packages.
- Apply migrations on a disposable database and run the repository integration
  test with `TEST_DATABASE_URL`.
- Run both frontend lint/typecheck/build, `test:platform-configuration`, Admin
  no-orange, and both vendor-foundation guards.
- Verify Admin and Portal at desktop and 390 px; test publish, Portal rendering,
  rollback, denied access, invalid URL, invalid Media reference, and outage.
