# ADR-017: Analytics Privacy Policy

## Status
Accepted

## Context
Teman Belajar must track platform usage (pageviews, learning utilization, search engagement) to provide product statistics. However, we must ensure these analytics do not infringe on learner privacy. We need to explicitly define what data is collected and how users are identified.

## Decision
1. **No Invasive Tracking**: We will not use browser fingerprinting, canvas fingerprinting, or device hardware derivation.
2. **Visitor Identity**: Anonymous unique visitors will be tracked using an opaque, randomly generated `analytics_visitor_id` (UUIDv4) stored in a first-party `SameSite=Lax`, `HttpOnly` cookie. This identifier cannot be read cross-site.
3. **Authenticated Identity**: Raw OIDC `sub`, emails, and usernames MUST NOT be stored in raw analytics events. If an authenticated correlation is strictly required, it must be a server-side HMAC-derived pseudonymous key.
4. **IP Addresses**: Raw IP addresses will not be stored permanently. Any bot-detection or geo-resolution must happen transiently in memory, and only coarse aggregates (e.g., country/region) or bot classifications may be persisted.
5. **URL Privacy**: Arbitrary query strings will be stripped before analytics ingestion. Only an allowlist of analytical parameters will be preserved.
6. **Telemetry Labels (Cardinality & Privacy)**: Prometheus metrics and OpenTelemetry traces must NEVER include user IDs, emails, sensitive content titles, or full arbitrary URLs as dimensions.
7. **Retention**: Raw granular events (e.g., page views) will be aggregated into daily rollups by the `analytics-worker`. Raw events will be deleted after a 30-day retention period. Long-term aggregates are privacy-safe and can be kept indefinitely.

## Consequences
- We meet enterprise privacy expectations and minimize compliance risk.
- We cannot provide a "timeline of every click User X made across the platform" (which is an intentional restriction).
- Defining unique visitors relies on cookie persistence. Clearing cookies results in a new unique visitor count.
