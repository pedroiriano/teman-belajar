# TASK-011D Threat Model — SEO, Taxonomy & Public Discoverability

## Protected assets

Publication boundaries, canonical origins, redirect integrity, metadata/JSON-LD
output, controlled vocabulary, Media Asset references, and search/sitemap
visibility.

## Threats and controls

| Threat | Control |
|---|---|
| Canonical poisoning or open redirect | Canonical accepts only a bounded internal path matching content type; redirects are generated from validated slugs only. |
| Redirect self-loop, cycle, or chain abuse | Transactional collision/cycle checks; historical rows collapse directly to the current slug. |
| Unsafe slug/path traversal | Lowercase bounded slug allowlist plus reserved-route rejection in domain and database constraints. |
| Metadata or JSON-LD injection | React metadata APIs plus application-owned JSON-LD with `<`, `>`, `&`, U+2028, and U+2029 escaping; no raw editor JSON-LD. |
| Unauthorized vocabulary/profile mutation | Bearer authentication and server-side Portal Administrator/Content Editor checks; reviewer remains read-only. |
| Draft/private publication leakage | Public reads, sitemap, search, taxonomy, and Media eligibility require published/indexable state and active Knowledge ancestry. |
| Malicious social image reference | Repository accepts only active Media Assets with detected `image/*` MIME. |
| Taxonomy collision/confusables | Normalized identity and unique `(domain, normalized_name)` plus unique slug constraints. |
| Crawl trap/thin doorway pages | Explicit canonical/noindex policies and minimum eligible-item thresholds; search/filter/history URLs excluded from sitemap. |

## Residual risks

- Search-engine interpretation remains external and cannot be guaranteed.
- Editorial quality, alt-text meaning, and related-link usefulness require human
  review; the SEO Health Assistant is advisory, not a ranking score.
- Production hostname, crawl rate, and monitoring are TASK-012 verification
  inputs; TASK-011D does not deploy production infrastructure.
