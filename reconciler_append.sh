
# Reconcile Management Client
manage_uuid=$("$kcadm" get clients --config "$config_file" -r "$realm" -q "clientId=teman-belajar-admin-management" --fields id --format csv --noquotes)
if [[ -n "$manage_uuid" ]]; then
  "$kcadm" update "clients/$manage_uuid" --config "$config_file" -r "$realm" \
    -s serviceAccountsEnabled=true \
    -s standardFlowEnabled=false \
    -s implicitFlowEnabled=false \
    -s publicClient=false \
    -s bearerOnly=false \
    -s directAccessGrantsEnabled=false >/dev/null
    
  sa_user_id=$("$kcadm" get "users" --config "$config_file" -r "$realm" -q "username=service-account-teman-belajar-admin-management" --fields id --format csv --noquotes)
  rm_uuid=$("$kcadm" get clients --config "$config_file" -r "$realm" -q "clientId=realm-management" --fields id --format csv --noquotes)
  
  if [[ -n "$sa_user_id" && -n "$rm_uuid" ]]; then
    # Assign least-privilege realm-management roles
    "$kcadm" add-roles --config "$config_file" -r "$realm" --uusername "service-account-teman-belajar-admin-management" --cclientid "realm-management" --rolename "manage-users" --rolename "query-users" --rolename "view-users" >/dev/null 2>&1 || true
    echo "PASS Keycloak Management client: teman-belajar-admin-management"
  fi
fi

