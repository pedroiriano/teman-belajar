# Teman Belajar Moodle Integration Plugin

This is the `local_temanbelajar` plugin. It provides a dedicated external service for Teman Belajar Portal integration and will host custom external API endpoints for syncing data between the Portal and Moodle.

## Requirements
- Moodle 4.3+ (Tested on Moodle 5.2.2+)
- OAuth2 configured with Keycloak for SSO.
- Moodle Web Services enabled (REST protocol).

## Features
- Dedicated External Service definition.
- Least-privilege visible-course catalogue that skips hidden categories,
  hidden courses, and invalid course contexts without granting broad Moodle
  course-view capabilities to the integration account.
- Stable federated-user resolution for Portal integration.
- Automatic OAuth2 login through the `teman-belajar-moodle` Keycloak client.
- Moodle-initiated RP logout and Keycloak front-channel logout reception,
  including browser-cookie reconciliation when Moodle's SameSite=Lax session
  cookie is omitted from Keycloak's cross-origin logout iframe. Interactive
  Moodle logout uses signed top-level Portal and Admin hops before Keycloak so
  both NextAuth sessions are deterministically expired first-party.
- Signed, timestamped top-level logout bridge for Portal/Admin initiated logout,
  as the Moodle hop of the governed counterpart-web -> Moodle -> initiator
  chain, with exact return-URL allowlisting and a dedicated environment-only
  secret.
- Fail-closed protection that allows Moodle Site Administrator only when both
  the exact configured federated username and the dedicated Keycloak
  `LMS Administrator` claim match. Other federated administrative drift is
  denied; the local recovery administrator remains separate.
- Privacy-safe learning analytics for an inclusive `start_date`/`end_date`
  window (maximum 365 days). The aggregate uses active student-role enrolments,
  excludes site admins and inactive accounts, and calculates completion rate
  from one consistent eligible-enrolment cohort without returning identities.

## Installation
Map this directory to `local/temanbelajar` inside your Moodle installation and run Moodle upgrade.

After install or upgrade, the governed container entrypoint runs
`cli/reconcile_integration.php`. That idempotent CLI adopts the
`Teman Belajar Integration Service` if it predates component ownership, creates
the system-only `temanbelajar_analytics_reader` role, grants only
`local/temanbelajar:viewanalytics`, and assigns that role to users attached to
the external service. That analytics path never grants Site Administrator or
Manager and never edits Moodle core. The separate login observer may grant Site
Administrator only through the explicit two-factor authorization rule above.
It also enforces a distinct local recovery-administrator email and removes any
OAuth2 linked login attached to a Moodle Site Administrator. The configured
recovery email must never match a Keycloak user.
The recovery account is resolved by its exact configured username; linked-login
cleanup uses each administrator object's real Moodle user id, never collection
keys. In the governed local environment, that active `manual` recovery account
plus at most one exact `MOODLE_FEDERATED_ADMIN_USER` are the approved Site
Administrators. The federated account's OAuth2 link is preserved; drifted
secondary assignments and prohibited links are removed.
Any system-context role assignment with the `manager` archetype is also removed
from non-recovery users; component-owned least-privilege roles remain intact.
If that configured recovery username is absent, reconciliation recreates one
active `manual` account through Moodle's user API using the environment-injected
password; the credential is never printed or persisted in source. If the
configured recovery email is already owned by an active local `manual` Site
Administrator, that exact record is safely adopted by restoring its configured
username and password instead of creating a duplicate account.
For a preserved local volume, run the canonical Docker wrapper action
`moodle-reconcile` after updating this plugin. If Moodle core updates the exact
recovery account during a prohibited OAuth2 match, the observer restores its
local-only email before terminating the privileged session so the next login
can create or resolve a separate ordinary Moodle user.
