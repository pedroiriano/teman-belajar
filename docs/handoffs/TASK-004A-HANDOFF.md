# TASK-004A: Moodle 5.2.2+ Identity, OIDC & Web Services Integration Readiness Gate

## Overview
This task completes the identity mapping and architectural integration of the Teman Belajar ecosystem (Portal BFF, Go API, Media platform) with the Learning Engine (Moodle 5.2.2+). The primary objectives achieved were ensuring Moodle acts as the foundational course platform with external API access for the portal, backed by Keycloak Single Sign-On.

## Accomplishments

### 1. Identity and Access (OIDC SSO)
- Integrated Moodle `auth_oauth2` with the central **Keycloak** IdP.
- Implemented OIDC Issuer and Provider endpoints programmatically using safe automated provisioning scripts bypassing strict HTTPS validation during local Docker development mode (`$CFG->oauth2allowinsecure = true`).
- Registered strict OIDC redirect URIs in Keycloak matching Moodle endpoints (`http://localhost:8082/admin/oauth2callback.php`).
- Mapped identity fields correctly (username, email, firstname, lastname).

### 2. Moodle Web Services & Integration API
- Enabled Moodle REST Web Services protocols via automated configuration.
- Provisioned the dedicated `teman-belajar-integration` user.
- Configured a locked-down API integration framework avoiding global Admin API usage (Least-privilege).
- Generated and registered the `COMPROMISED_MOODLE_WS_TOKEN` persistent API token to `.env` for use by the `portal-api`.
- Whitelisted `core_course_get_courses` capability and exposed it through a custom External Service (`teman_belajar_integration`).

### 3. Dedicated `local_temanbelajar` Integration Plugin
- Structured the boilerplate for the `local_temanbelajar` plugin mapped to `/var/www/html/local/temanbelajar`.
- Configured plugin `version.php`, strings, and zero-data privacy provider.
- Setup `db/services.php` as a placeholder for hosting future custom external capabilities in TASK-005.

### 4. Background Infrastructure
- Configured the Docker Compose stack to seamlessly run `moodle-cron`.
- Verified Moodle cron executes flawlessly alongside background Adhoc tasks in an isolated Alpine container to prevent process starvation.

## Next Steps for TASK-005
- Develop specific Portal-Moodle sync logic via custom endpoints hosted under `local_temanbelajar`.
- Utilize the `portal-api` integration layer to federate Moodle catalog endpoints to Next.js UI using the generated Web Services token.

## Environment Details
- **Docker Network**: `teman-belajar-network`
- **Moodle Port**: 8082
- **Integration User**: `teman-belajar-integration`
- **Moodle Token Environment Key**: `TB_MOODLE_WEBSERVICE_TOKEN`
