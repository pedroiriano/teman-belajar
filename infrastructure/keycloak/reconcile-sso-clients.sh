#!/usr/bin/env bash
set -euo pipefail

: "${KEYCLOAK_ADMIN:?KEYCLOAK_ADMIN is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"
: "${PORTAL_WEB_URL:?PORTAL_WEB_URL is required}"
: "${ADMIN_WEB_URL:?ADMIN_WEB_URL is required}"
: "${MOODLE_BASE_URL:?MOODLE_BASE_URL is required}"

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
    -s "attributes.\"post.logout.redirect.uris\"=$PORTAL_WEB_URL/*" >/dev/null
  echo "PASS Keycloak SSO client: $client_id"
}

configure_client "teman-belajar-web" "$PORTAL_WEB_URL/api/auth/frontchannel-logout"
configure_client "teman-belajar-admin" "$ADMIN_WEB_URL/api/auth/frontchannel-logout"
configure_client "teman-belajar-moodle" "$MOODLE_BASE_URL/local/temanbelajar/federated_logout.php"
