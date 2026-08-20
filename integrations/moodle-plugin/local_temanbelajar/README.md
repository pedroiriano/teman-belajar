# Teman Belajar Moodle Integration Plugin

This is the `local_temanbelajar` plugin. It provides a dedicated external service for Teman Belajar Portal integration and will host custom external API endpoints for syncing data between the Portal and Moodle.

## Requirements
- Moodle 4.3+ (Tested on Moodle 5.2.2+)
- OAuth2 configured with Keycloak for SSO.
- Moodle Web Services enabled (REST protocol).

## Features
- Dedicated External Service definition.
- Stable federated-user resolution for Portal integration.
- Automatic OAuth2 login through the `teman-belajar-moodle` Keycloak client.
- Moodle-initiated RP logout and Keycloak front-channel logout reception.
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
the external service. It never grants Site Administrator or Manager and never
edits Moodle core.
