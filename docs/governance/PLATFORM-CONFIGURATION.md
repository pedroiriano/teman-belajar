# Platform Configuration Governance

## Boundary

Platform Configuration controls presentation only: tagline/logo reference,
homepage order/visibility, safe navigation, banner, footer, contact/help, SEO
defaults, and labels/visibility for already-active features. `Teman Belajar` is
immutable. Configuration cannot create or activate routes, grant capability,
alter authorization, change identity, store secret/env/credential values, or
inject HTML, script, or CSS.

## Schema and links

- Portal API owns the typed, deny-by-default schema and rejects unknown keys.
- Request bodies are bounded to 64 KiB; text, counts, UUIDs, and duplicate
  section orders are validated server-side.
- Internal links must be absolute paths without traversal, host, userinfo, or
  protocol-relative form. External links must be HTTPS and match
  `PLATFORM_CONFIG_EXTERNAL_HOST_ALLOWLIST`; the default allowlist is empty.
- Only existing presentation keys are accepted. Webinar and other `Segera`
  features cannot be activated by configuration.
- Logo, banner, and social image values are Media Asset UUID references. The
  referenced asset must be active and image MIME; storage keys and MinIO details
  never enter the configuration response.

## Lifecycle

Every save creates an immutable content revision. A transaction-scoped advisory
lock plus `expected_version` prevents lost updates. Publish changes the current
draft and prior published status atomically. Rollback clones a historical
configuration into a new published version; history is never rewritten.
Admin preview is authenticated, no-store, noindex, and never exposed by a public
route. Successful publish/rollback invalidates the compiled in-process cache.

Public reads return the published schema or the compiled safe fallback. A cache
or repository outage cannot expose a draft, internal error, URL, or secret.
Admin view, preview, save, publish, rollback, denied access, and public compiled
reads are auditable through the central Audit Center.
