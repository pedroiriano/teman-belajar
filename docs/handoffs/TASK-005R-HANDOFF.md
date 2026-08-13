# TASK-005R — Moodle Adapter Correctness, Stable Identity & Release Reconciliation

## 1. Summary of Changes

* **Propagate Context (Auth Claims)**: Refactored `LearningHandler` to use `ClaimsFromContext` which reliably extracts JWT claims from `http.Request.Context()` rather than unstable untyped values, ensuring user subject propagation to the provider layer is secure.
* **Stable Identity Mapping (`resolve_federated_user`)**: Replaced the Moodle-core `core_user_get_users_by_field` with a custom webservice `local_temanbelajar_resolve_federated_user` built in `local_temanbelajar` v`2026081300`. This service queries `auth_oauth2_linked_login` reliably using the JWT `sub` and gracefully denies mapping when unmapped.
* **IDOR Prevention & Enrolment Verification**: Implemented strict authorization blocks in `GetMyCourseCompletion` and `GetMyCourseGrades` by fetching `ListUserCourses` and checking if the requesting user actually holds an active enrolment before querying Moodle.
* **Canonical Error Responses (RFC 7807)**: Handlers now gracefully respond with proper `application/problem+json` formatted models ensuring structured debugging without exposing internal `debuginfo`. Added new mapped statuses for `ErrMoodleInvalidResponse`, `ErrLearningUserNotMapped`, and disabled course completion scenarios.
* **Visible Filter and Limit Readers**: Re-engineered the Moodle REST client to use `io.LimitReader` (fail fast > 5MB payload), forcefully reject `"null"` or `"false"` string-only responses, and updated `ListCourses` parser to securely omit courses with `visible == 0`.
* **API Startup Checks**: Updated `main.go` to strictly check if `TB_MOODLE_WEBSERVICE_TOKEN` exists and whether `MOODLE_INTERNAL_BASE_URL` is a valid URI format before initializing the Moodle Provider logic.
* **OpenAPI Synchronization**: Reconciled `/api/v1/learning/me/courses`, `/completion`, and `/grades` definitions with RFC 7807 problem json models and `nullable` values for `enrolled_at`.
* **Fixtures Created**: Moodle initialization testing data for hidden and visible courses is built into `/infrastructure/fixtures/setup_moodle_learning_fixture.php`.

## 2. Release State

* The API and Moodle services pass integration testing.
* E2E Docker compose services successfully restart and run backend without crashing.
* `openapi.yaml` matches the server.
* All unit tests passed including Moodle client error boundary scenarios (Large Responses, IDOR, Malformed Auth context).
* Version `2026081300` of `local_temanbelajar` is cleanly installed and configured in the container.

## 3. Definition of Done Checklist

- [x] AC pass;
- [x] tests pass;
- [x] lint/typecheck pass;
- [x] security requirements pass (Fail-closed on Identity missing, IDOR checks on Completion/Grades);
- [x] docs/contracts updated (`openapi.yaml` synced);
- [x] PR is reviewable and scoped to TASK-005R defect correction.

## 4. Next Steps for TASK-006

- Implement the UI dashboard using the freshly verified endpoints (`/learning/me/courses`, `/learning/me/courses/{id}/completion`, `/learning/me/courses/{id}/grades`).
- Rely on proper Problem JSON (`status=401`, `status=403`) for handling graceful degradation in Portal Web app.
