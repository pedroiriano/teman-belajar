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

## Installation
Map this directory to `local/temanbelajar` inside your Moodle installation and run Moodle upgrade.
