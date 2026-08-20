#!/usr/bin/env bash
set -euo pipefail

: "${KEYCLOAK_ADMIN:?KEYCLOAK_ADMIN is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"
: "${PORTAL_WEB_URL:?PORTAL_WEB_URL is required}"
: "${ADMIN_WEB_URL:?ADMIN_WEB_URL is required}"
: "${MOODLE_BASE_URL:?MOODLE_BASE_URL is required}"
: "${KEYCLOAK_MANAGEMENT_CLIENT_SECRET:?KEYCLOAK_MANAGEMENT_CLIENT_SECRET is required}"

realm="teman-belajar"
kcadm="/opt/keycloak/bin/kcadm.sh"
config_file="/tmp/teman-belajar-kcadm.config"
trap 'rm -f "$config_file"' EXIT

"$kcadm" config credentials --config "$config_file" \
  --server http://127.0.0.1:8080 --realm master \
  --user "$KEYCLOAK_ADMIN" --password "$KEYCLOAK_ADMIN_PASSWORD" >/dev/null

configure_client() {
  local client_id="$1"
  local logout_url="$2"
  local base_url="$3"
  local client_uuid
  client_uuid=$("$kcadm" get clients --config "$config_file" -r "$realm" \
    -q "clientId=$client_id" --fields id --format csv --noquotes)
  if [[ -z "$client_uuid" || "$client_uuid" == *$'\n'* ]]; then
    echo "Expected exactly one Keycloak client: $client_id" >&2
    exit 1
  fi

  "$kcadm" update "clients/$client_uuid" --config "$config_file" -r "$realm" \
    -s frontchannelLogout=true \
    -s "attributes.\"frontchannel.logout.url\"=$logout_url" \
    -s 'attributes."frontchannel.logout.session.required"=true' \
    -s "attributes.\"post.logout.redirect.uris\"=$base_url/*" >/dev/null
  echo "PASS Keycloak SSO client: $client_id"
}

configure_client "teman-belajar-web" "$PORTAL_WEB_URL/api/auth/frontchannel-logout" "$PORTAL_WEB_URL"
configure_client "teman-belajar-admin" "$ADMIN_WEB_URL/api/auth/frontchannel-logout" "$ADMIN_WEB_URL"
configure_client "teman-belajar-moodle" "$MOODLE_BASE_URL/local/temanbelajar/federated_logout.php" "$MOODLE_BASE_URL"

canonical_roles=(
  "Guest"
  "Learner"
  "Instructor"
  "Content Editor"
  "Reviewer"
  "Course Manager"
  "Portal Administrator"
  "LMS Administrator"
  "Auditor"
  "Super Administrator"
)

realm_roles=$("$kcadm" get roles --config "$config_file" -r "$realm" \
  --fields name --format csv --noquotes)
for role_name in "${canonical_roles[@]}"; do
  if ! grep -Fxq "$role_name" <<<"$realm_roles"; then
    "$kcadm" create roles --config "$config_file" -r "$realm" \
      -s "name=$role_name" >/dev/null
    realm_roles+=$'\n'"$role_name"
  fi
done

# The reconciliation script is the sole owner of the management client for
# both fresh and existing realms. The static realm import intentionally omits
# this secret-bearing client.
manage_uuid=$("$kcadm" get clients --config "$config_file" -r "$realm" -q "clientId=teman-belajar-admin-management" --fields id --format csv --noquotes)
if [[ -z "$manage_uuid" || "$manage_uuid" == *$'\n'* ]]; then
  echo "Creating teman-belajar-admin-management client..."
  "$kcadm" create clients --config "$config_file" -r "$realm" \
    -s clientId=teman-belajar-admin-management \
    -s name="Teman Belajar Admin Management" \
    -s enabled=true \
    -s clientAuthenticatorType=client-secret \
    -s secret="$KEYCLOAK_MANAGEMENT_CLIENT_SECRET" \
    -s standardFlowEnabled=false \
    -s implicitFlowEnabled=false \
    -s directAccessGrantsEnabled=false \
    -s serviceAccountsEnabled=true \
    -s publicClient=false >/dev/null
  manage_uuid=$("$kcadm" get clients --config "$config_file" -r "$realm" -q "clientId=teman-belajar-admin-management" --fields id --format csv --noquotes)
fi

if [[ -z "$manage_uuid" || "$manage_uuid" == *$'\n'* ]]; then
  echo "Expected exactly one Keycloak management client" >&2
  exit 1
fi

"$kcadm" update "clients/$manage_uuid" --config "$config_file" -r "$realm" \
  -s enabled=true \
  -s clientAuthenticatorType=client-secret \
  -s "secret=$KEYCLOAK_MANAGEMENT_CLIENT_SECRET" \
  -s serviceAccountsEnabled=true \
  -s standardFlowEnabled=false \
  -s implicitFlowEnabled=false \
  -s publicClient=false \
  -s bearerOnly=false \
  -s fullScopeAllowed=false \
  -s directAccessGrantsEnabled=false >/dev/null

sa_user_id=$("$kcadm" get users --config "$config_file" -r "$realm" \
  -q "username=service-account-teman-belajar-admin-management" --fields id --format csv --noquotes)
rm_uuid=$("$kcadm" get clients --config "$config_file" -r "$realm" \
  -q "clientId=realm-management" --fields id --format csv --noquotes)
if [[ -z "$sa_user_id" || "$sa_user_id" == *$'\n'* || -z "$rm_uuid" || "$rm_uuid" == *$'\n'* ]]; then
  echo "Management service account or realm-management client is not unique" >&2
  exit 1
fi

assigned_roles=$("$kcadm" get "users/$sa_user_id/role-mappings/clients/$rm_uuid" \
  --config "$config_file" -r "$realm" --fields name --format csv --noquotes)
for required_role in manage-users query-users view-users; do
  if ! grep -Fxq "$required_role" <<<"$assigned_roles"; then
    "$kcadm" add-roles --config "$config_file" -r "$realm" \
      --uid "$sa_user_id" --cclientid realm-management --rolename "$required_role" >/dev/null
  fi
done

assigned_roles=$("$kcadm" get "users/$sa_user_id/role-mappings/clients/$rm_uuid" \
  --config "$config_file" -r "$realm" --fields name --format csv --noquotes)
for required_role in manage-users query-users view-users; do
  if ! grep -Fxq "$required_role" <<<"$assigned_roles"; then
    echo "Missing required realm-management role: $required_role" >&2
    exit 1
  fi
done
for prohibited_role in realm-admin manage-realm; do
  if grep -Fxq "$prohibited_role" <<<"$assigned_roles"; then
    echo "Prohibited realm-management role assigned: $prohibited_role" >&2
    exit 1
  fi
done

# With fullScopeAllowed=false, service-account assignments are intentionally
# absent from tokens unless the management client explicitly scopes them in.
# Map only the three approved realm-management roles so client_credentials
# tokens remain operational without gaining realm-admin/manage-realm.
scope_roles=$("$kcadm" get "clients/$manage_uuid/scope-mappings/clients/$rm_uuid" \
  --config "$config_file" -r "$realm" --fields name --format csv --noquotes)
for required_role in manage-users query-users view-users; do
  if ! grep -Fxq "$required_role" <<<"$scope_roles"; then
    role_json=$("$kcadm" get "clients/$rm_uuid/roles/$required_role" \
      --config "$config_file" -r "$realm" --compressed)
    "$kcadm" create "clients/$manage_uuid/scope-mappings/clients/$rm_uuid" \
      --config "$config_file" -r "$realm" -b "[$role_json]" >/dev/null
    scope_roles+=$'\n'"$required_role"
  fi
done

scope_roles=$("$kcadm" get "clients/$manage_uuid/scope-mappings/clients/$rm_uuid" \
  --config "$config_file" -r "$realm" --fields name --format csv --noquotes)
for required_role in manage-users query-users view-users; do
  if ! grep -Fxq "$required_role" <<<"$scope_roles"; then
    echo "Missing required management client scope: $required_role" >&2
    exit 1
  fi
done
for prohibited_role in realm-admin manage-realm; do
  if grep -Fxq "$prohibited_role" <<<"$scope_roles"; then
    echo "Prohibited management client scope present: $prohibited_role" >&2
    exit 1
  fi
done

for property in \
  "serviceAccountsEnabled:true" \
  "standardFlowEnabled:false" \
  "implicitFlowEnabled:false" \
  "directAccessGrantsEnabled:false" \
  "publicClient:false"; do
  property_name=${property%%:*}
  expected_value=${property##*:}
  actual_value=$("$kcadm" get "clients/$manage_uuid" --config "$config_file" -r "$realm" \
    --fields "$property_name" --format csv --noquotes)
  if [[ "$actual_value" != "$expected_value" ]]; then
    echo "Unexpected management client property: $property_name" >&2
    exit 1
  fi
done

configured_secret=$("$kcadm" get "clients/$manage_uuid/client-secret" \
  --config "$config_file" -r "$realm" --fields value --format csv --noquotes)
if [[ "$configured_secret" != "$KEYCLOAK_MANAGEMENT_CLIENT_SECRET" ]]; then
  echo "Management client secret reconciliation failed" >&2
  exit 1
fi

echo "PASS Keycloak Management client: teman-belajar-admin-management"
