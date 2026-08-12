# Moodle SSO Foundation

To integrate Moodle with the Teman Belajar central identity provider (Keycloak), we use the official **OpenID Connect (auth_oidc)** plugin for Moodle. 
Direct database patching or copying of users is strictly prohibited per canonical architecture (`ADR-010`).

## Configuration Requirements

1. **Install Plugin**: Install `auth_oidc` and its dependencies (e.g., `local_o365` if bundled, or standard generic OIDC plugin).
2. **Client Registration**: 
   - Moodle acts as a confidential client.
   - Client ID: `teman-belajar-moodle`
   - Client Secret: Provide via secure environment injection (do not hardcode).
3. **Endpoints**:
   - **Issuer URL**: `https://[identity-domain]/realms/teman-belajar`
   - **Authorization Endpoint**: `https://[identity-domain]/realms/teman-belajar/protocol/openid-connect/auth`
   - **Token Endpoint**: `https://[identity-domain]/realms/teman-belajar/protocol/openid-connect/token`
   - **Userinfo Endpoint**: `https://[identity-domain]/realms/teman-belajar/protocol/openid-connect/userinfo`
4. **Field Mapping**:
   - Moodle `username` should map to Keycloak `preferred_username`.
   - Moodle `email` should map to Keycloak `email`.
   - Moodle `firstname` and `lastname` map to Keycloak `given_name` and `family_name`.
5. **SSO Behavior**: 
   - Configure Moodle to force login via the Keycloak OIDC provider.
   - Ensure "Auto-create users" is enabled for seamless provisioning upon first SSO login.

*Note: Business logic sync (course enrollments, metadata) will be handled separately. This document covers authentication foundation only.*
