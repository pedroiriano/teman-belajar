# Learning Paths Operations

## Publish

1. Compose only sources returned by the Admin options endpoint. A TASK-015
   webinar may be added only as optional while capacity is 0.
2. Confirm order, prerequisite DAG, required flags and milestones; submit,
   approve and publish through Admin.
3. Publication revalidates every required source. `degraded/unavailable` required
   sources fail closed; an optional outage remains visible without dropping the path.
4. Verify public detail, learner-bound version, progress provenance and next step.

## Revision, incident and rollback

Published versions are immutable. Create a new revision; existing learners stay
bound to the prior version. For a source outage, inspect correlation logs and
the source adapter without changing Moodle/Portal ownership. Roll back the app
consumer if necessary; never edit migration 024 or published rows manually.

## Fixture cleanup

Archive a disposable path through the official Admin transition endpoint and
confirm it disappears publicly. Isolated repository tests may transactionally
remove their own rows. Never delete non-fixture learning history.
