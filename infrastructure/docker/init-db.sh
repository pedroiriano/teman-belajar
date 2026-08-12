#!/bin/sh
set -eu

: "${POSTGRES_USER:?POSTGRES_USER is required}"
: "${POSTGRES_DB:?POSTGRES_DB is required}"
: "${KEYCLOAK_DB_NAME:?KEYCLOAK_DB_NAME is required}"
: "${KEYCLOAK_DB_USER:?KEYCLOAK_DB_USER is required}"
: "${KEYCLOAK_DB_PASSWORD:?KEYCLOAK_DB_PASSWORD is required}"

# Runs only when the PostgreSQL data directory is first initialized.
# psql variables plus format(%I/%L) keep identifiers and passwords quoted.
psql \
  --set=ON_ERROR_STOP=1 \
  --set=keycloak_db="$KEYCLOAK_DB_NAME" \
  --set=keycloak_user="$KEYCLOAK_DB_USER" \
  --set=keycloak_password="$KEYCLOAK_DB_PASSWORD" \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'keycloak_user', :'keycloak_password')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = :'keycloak_user'
) \gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'keycloak_db', :'keycloak_user')
WHERE NOT EXISTS (
  SELECT 1 FROM pg_database WHERE datname = :'keycloak_db'
) \gexec
EOSQL
