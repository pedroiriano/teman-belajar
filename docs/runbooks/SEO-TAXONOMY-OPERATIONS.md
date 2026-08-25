# SEO and Taxonomy Operations

## Ownership and invariants

- Portal API owns Category, Tag, SEO profiles, slug history, landing policy,
  and the sitemap source. Portal Web renders public metadata and JSON-LD.
- Category and Tag are controlled vocabularies. Do not create free-form tags,
  comma-separated tag fields, meta keywords, or a second taxonomy store.
- Never edit an applied migration. Migration 016 is forward-only.
- Never enter raw JSON-LD or external canonical/redirect URLs. Canonical
  overrides must be safe local paths matching the content route.

## Editorial flow

1. Create active vocabulary in **Admin → Taxonomy**. A normalized duplicate
   such as `SPBE`, `spbe`, or `Spbe` is rejected.
2. In News, Announcement, or Knowledge authoring, set the slug, Category, Tags,
   metadata, social image, and indexability in **SEO & Discovery**.
3. Select social images through Media Manager. Only an active image Media Asset
   is accepted; the database stores its UUID, not a storage URL/key.
4. Auto-Save includes all SEO fields. The canonical content save finalizes the
   draft through the existing TASK-011A workflow.
5. Publication state remains authoritative. Checking indexability never makes
   draft, review, archived, private, or inactive-hierarchy content public.

## Landing and crawl policy

- Active Category landing: indexable at two or more eligible public items.
- Active Tag landing: indexable at three or more eligible public items.
- Knowledge-node landing: active ancestry and at least two eligible articles.
- Thin landings remain reachable for navigation but emit `noindex` and are
  absent from the sitemap. Search and filtered/paginated variants are noindex.
- `robots.txt` is crawl guidance, never an authorization mechanism.

## Slug changes and rollback

- A published slug change atomically writes a 308 history record. Earlier
  history points directly to the current slug, avoiding redirect chains.
- If a change is wrong, update the content to a new safe slug through Admin;
  do not edit redirect rows manually. Collisions/cycles are rejected.
- To roll back application code, revert the task commit and rebuild through the
  official Docker wrapper. Do not delete volumes or reverse migration 016.

## Verification

- Check `/sitemap.xml` and `/robots.txt` from Portal Web.
- Verify a current public News and Knowledge page has title, description,
  canonical, robots, Open Graph, breadcrumb, and parseable JSON-LD in server
  HTML.
- Verify an old published slug returns an internal permanent redirect.
- Run Admin `test:seo` and `test:no-orange`, Portal `test:seo`, Go tests, and
  OpenAPI lint after behavior changes.
