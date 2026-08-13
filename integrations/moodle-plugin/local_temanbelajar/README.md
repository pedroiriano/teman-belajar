# Teman Belajar Moodle Integration Plugin

This is the `local_temanbelajar` plugin. It provides a dedicated external service for Teman Belajar Portal integration and will host custom external API endpoints for syncing data between the Portal and Moodle.

## Requirements
- Moodle 4.3+ (Tested on Moodle 5.2.2+)
- OAuth2 configured with Keycloak for SSO.
- Moodle Web Services enabled (REST protocol).

## Features
- Dedicated External Service definition.
- Boilerplate for custom external functions (TASK-005).

## Installation
Map this directory to `local/temanbelajar` inside your Moodle installation and run Moodle upgrade.
