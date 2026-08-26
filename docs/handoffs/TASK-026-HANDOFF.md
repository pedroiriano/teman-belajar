# TASK-026 Handoff — Full Vendor Runtime UI Foundations

## Status

`IMPLEMENTED — RELEASE CANDIDATE` pending protected PR completion.

## Outcome

- Portal now declares a Techwind runtime root, Nunito font, structural shell,
  Remix-mapped typed icons and lifecycle-safe navigation/sticky/back-to-top.
- Admin declares a Cuba runtime root, Rubik font, canonical page shell,
  Feather-mapped icons, shared Cuba data table/pagination, and accessible
  drawer/disclosure behavior.
- Existing `portal-*`/`admin-*` primitives are retained as semantic product
  aliases so feature behavior and state contracts are preserved.
- No vendor global bundle, demo content, second UI framework or new runtime
  dependency was introduced. `ORIGINAL/` tree IDs are pinned and unchanged.
- Admin's bright sky/light-blue, no-orange, Indonesian UI and Notification
  contracts remain mandatory.

## Authority and maintenance

Read ADR-018, `VENDOR-UI-RUNTIME-MANIFEST.md`, `UI-SOURCE-MAPPING.md`, and
`UI-FOUNDATION-INTEGRATION-GUIDE.md` before future UI work. Run the relevant
app's `test:vendor-foundation` command. Vendor refreshes require a bounded intake
review and simultaneous manifest/baseline update; do not edit originals during
feature work.

## Scope boundary and rollback

No Identity/SSO/RBAC, Moodle, backend contract, migration, Docker topology,
secret or production behavior changed. Roll back by reverting the release
commit; there is no data rollback.

## Verification evidence

- Base: `07fa6bb0cd7c418e9c6ba5077d2301eb06bf73aa` (`origin/main`).
- Portal/Admin vendor, language, Notification, theme, no-orange, data table,
  pagination and affected feature contract guards: PASS.
- Agent governance, lint, TypeScript and production builds: PASS. Windows local
  build used the Next.js-recommended Webpack fallback because that installation
  had SWC-WASM only; clean Linux Docker builds passed with canonical Turbopack.
- `npm audit --omit=dev`: 0 vulnerabilities in both applications.
- Docker `npm ci`, lint, typecheck, build and targeted recreate: PASS; only
  `web` and `admin` were recreated and returned healthy. No volume, database,
  SSO, Moodle, port or configuration mutation was performed.
- Browser QA: Portal home/navigation/content/back-to-top and Admin dashboard,
  table, form and Notification passed representative desktop/mobile and
  light/dark checks. Runtime fonts resolved to Nunito/Rubik; drawer Escape
  restored focus; no console/hydration error or controlled Admin orange color
  was detected.
- The retained browser session exposed the supported Notification unauthorized
  state after frontend recreate. Notification source was unchanged and its
  dedicated contract passed.
- Vendor `ORIGINAL/` trees match their immutable recorded Git tree IDs; no
  Techwind/Cuba cross-import, demo branding, secret or third UI framework.

## Remaining risk

Visual QA is representative rather than every route/theme/viewport Cartesian
combination. Protected Linux CI is the broad final authority. Any future vendor
snapshot refresh must be isolated, license-reviewed and update the manifest and
tree guard together.

Final commit, PR, protected checks, browser evidence and merged `main` SHA are
reported in the release output and GitHub metadata, which are authoritative
over this pre-merge handoff status.
