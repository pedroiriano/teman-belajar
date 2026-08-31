# Full Training Programs Operations

## Ownership and invariants

- Portal API owns program editorial metadata, course ordering, cohort schedule,
  publication workflow, audit, public discovery, and aggregation presentation.
- Moodle remains authoritative for course visibility, enrolment, completion,
  progress, and formal learning. Never query the Moodle database or copy those
  states into migration 019.
- Course composition reads use
  `local_temanbelajar_list_visible_courses`, an allowlisted Moodle plugin
  contract that returns only visible courses in visible categories and skips
  invalid contexts. Do not replace it with broad `viewhiddencourses` access.
- Admin renders the Cuba workspace at `/dashboard/training-programs`. Portal
  renders the Techwind catalogue/detail at `/training-programs`.
- Migration `019_create_training_programs.sql` is additive and forward-only.
  Evolve it only through a later migration after it has been applied.

## Workflow and authorization

| Operation | Content Editor | Reviewer | Portal Administrator |
|---|---:|---:|---:|
| Read workspace/course options | Yes | Yes | Yes |
| Create/edit draft composition | Yes | No | Yes |
| Draft → In review | Yes | No | Yes |
| In review → Approved/Draft | No | Yes | Yes |
| Approved → Published/Draft | No | Yes | Yes |
| Published → Archived | Yes | Yes | Yes |

Actor and roles come only from validated OIDC claims. Browser affordances do
not replace API authorization. Write and transition actions emit audit events.

## Authoring and publication

1. Open **Admin → Program Pelatihan**. If Moodle is unavailable, keep
   composition read-only until the live course options can be validated.
2. Create a draft with a safe slug, summary, description, at least one visible
   Moodle course, and optional audience/eligibility guidance.
3. Order courses explicitly, mark required items, and add bounded cohort
   schedules. Cohorts are presentation only, not Portal-owned registration.
4. Submit for review. Publishing revalidates all referenced course IDs against
   Moodle; do not bypass a 503 or replace a missing course with demo data.
5. Verify the public page and authenticated learner state before release.

## Degradation and CTA truth

- Catalogue/editorial data remains available when Moodle course enrichment
  fails. `provenance.state=degraded` and a bounded detail explain which read
  failed; raw upstream errors are not exposed.
- `start` or `review` CTA is emitted only for a course present in the learner's
  Moodle enrolments. Otherwise API returns `check_access` with `unverified`
  eligibility. UI copy must not convert that state into an access promise.
- Aggregate progress is the sum of composed-course Moodle progress divided by
  all composed courses. Completed courses count as 100; non-enrolled courses
  count as zero. `checked_at` is the freshness timestamp.
- Monitor `training_program_aggregations_total{operation,state}` and generic
  HTTP duration/status metrics. Alert on sustained degraded results, not on a
  single transient request.

## Verification

1. In `services/portal-api`: `go test ./...` and `go vet ./...` with `GOCACHE`
   on a writable local path if needed.
2. In both frontend apps: `npm run lint`, `npm run typecheck`,
   `npm run test:training-programs`, `npm run test:vendor-foundation`, and
   `npm run build`.
3. Validate `openapi/openapi.yaml` with the pinned Redocly command used by CI.
4. Browser-test Portal catalogue/detail and Admin composition at desktop/mobile,
   keyboard-only, Light/Dark, empty/error/degraded/unauthorized states.
5. Confirm vendor `ORIGINAL/`, Identity/SSO, Moodle core, Docker topology,
   secrets, and unrelated roadmap routes are unchanged.

## Rollback

Revert the TASK-013 application changes and rebuild `api`, `web`, and `admin`
through the official Docker wrapper. Leave migration 019 and authored data
forward-applied. Do not delete volumes, reverse the schema, weaken authz, or
deploy to production without the separate human release decision.
