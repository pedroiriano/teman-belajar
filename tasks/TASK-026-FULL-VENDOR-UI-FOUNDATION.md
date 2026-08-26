# TASK-026 — Full Techwind & Cuba Runtime UI Foundation Migration

**Owner Agent:** Frontend/UI Platform
**Dependencies:** TASK-003F, TASK-011C, TASK-025
**Status:** DONE — MERGED via PR #28

## Objective

Make the relevant licensed Techwind and Cuba systems explicit, complete and
machine-verifiable runtime foundations without changing product behavior.

## Scope

- inventory, ADR, source mapping and runtime manifest;
- Portal Techwind shell/font/icon/CSS/React interaction foundation;
- Admin Cuba shell/font/icon/CSS/table/pagination/React interaction foundation;
- semantic compatibility aliases, light/dark, accessibility and no-orange;
- immutable-source, cross-import, branding and parallel-framework guards;
- documentation, final verification, browser QA and protected PR delivery.

Identity/SSO/RBAC, Moodle, APIs, migrations, Docker topology, production,
vendor originals and unrelated features are out of scope.

## Acceptance criteria

- Both apps keep Next.js 16.3.0 and React 19.2.8 and build successfully.
- Techwind/Cuba entry points and React-safe behaviors are present and tested.
- No cross-import, vendor branding/demo runtime or additional UI framework.
- Admin bright sky/light-blue and no-orange checks pass in both themes.
- Existing Indonesian, data presentation and Notification contracts pass.
- Representative desktop/mobile light/dark browser QA has no critical defect.
- Documentation and protected PR evidence are complete.

## Rollback

Revert the TASK-026 squash commit. No schema, API, secret, identity, Moodle or
infrastructure state needs rollback.
