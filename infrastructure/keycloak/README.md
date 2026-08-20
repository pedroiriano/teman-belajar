# Keycloak

Realm/client configuration for `teman-belajar`.

The realm JSON owns the three interactive OIDC clients and ten canonical
product roles. The idempotent reconciliation script exclusively owns
`teman-belajar-admin-management`, including its configured secret and the
least-privilege service-account roles `manage-users`, `query-users`, and
`view-users`. Run it only through the governed Docker wrapper action `sso`;
never print client secrets or access tokens.
