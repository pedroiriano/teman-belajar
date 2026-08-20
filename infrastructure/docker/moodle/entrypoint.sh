#!/bin/bash
set -euo pipefail

MOODLE_DIR="/var/www/html"
MOODLE_DATA_DIR="/var/www/moodledata"

: "${MOODLE_DATABASE_HOST:?MOODLE_DATABASE_HOST is required}"
: "${MOODLE_DATABASE_NAME:?MOODLE_DATABASE_NAME is required}"
: "${MOODLE_DATABASE_USER:?MOODLE_DATABASE_USER is required}"
: "${MOODLE_DATABASE_PASSWORD:?MOODLE_DATABASE_PASSWORD is required}"
: "${MOODLE_BASE_URL:?MOODLE_BASE_URL is required}"
: "${MOODLE_KEYCLOAK_ISSUER:?MOODLE_KEYCLOAK_ISSUER is required}"
: "${MOODLE_POST_LOGOUT_REDIRECT_URL:?MOODLE_POST_LOGOUT_REDIRECT_URL is required}"
: "${MOODLE_ADMIN_USER:?MOODLE_ADMIN_USER is required}"
: "${MOODLE_ADMIN_PASSWORD:?MOODLE_ADMIN_PASSWORD is required}"
: "${MOODLE_ADMIN_EMAIL:?MOODLE_ADMIN_EMAIL is required}"

mkdir -p "$MOODLE_DATA_DIR"
chown -R www-data:www-data "$MOODLE_DATA_DIR"
chmod 2770 "$MOODLE_DATA_DIR"

if [ ! -f "$MOODLE_DIR/config.php" ]; then
    echo "Moodle config.php not found. Running CLI installation..."

    # Wait for the database to be ready
    until php -r "new PDO('pgsql:host=$MOODLE_DATABASE_HOST;dbname=$MOODLE_DATABASE_NAME', '$MOODLE_DATABASE_USER', '$MOODLE_DATABASE_PASSWORD');" &> /dev/null; do
        echo "Waiting for PostgreSQL database $MOODLE_DATABASE_HOST..."
        sleep 3
    done

    echo "Database is ready. Installing Moodle..."
    sudo -u www-data php "$MOODLE_DIR/admin/cli/install.php" \
        --chmod=2770 \
        --lang=en \
        --dbtype=pgsql \
        --dbhost="$MOODLE_DATABASE_HOST" \
        --dbname="$MOODLE_DATABASE_NAME" \
        --dbuser="$MOODLE_DATABASE_USER" \
        --dbpass="$MOODLE_DATABASE_PASSWORD" \
        --dbport=5432 \
        --fullname="Teman Belajar LMS" \
        --shortname="TB" \
        --adminuser="$MOODLE_ADMIN_USER" \
        --adminpass="$MOODLE_ADMIN_PASSWORD" \
        --adminemail="$MOODLE_ADMIN_EMAIL" \
        --non-interactive \
        --agree-license \
        --wwwroot="$MOODLE_BASE_URL" \
        --dataroot="$MOODLE_DATA_DIR"

    echo "Installation complete."
    php /usr/local/bin/sync-config.php
else
    echo "Moodle is already configured."
    php /usr/local/bin/sync-config.php
    sudo -u www-data php "$MOODLE_DIR/admin/cli/upgrade.php" --non-interactive
fi

sudo -u www-data php "$MOODLE_DIR/public/local/temanbelajar/cli/reconcile_integration.php"

# config.php and moodledata are the only runtime-owned paths managed here.
# The plugin source is intentionally mounted read-only and must never be chowned.
chown www-data:www-data "$MOODLE_DIR/config.php"
chmod 0640 "$MOODLE_DIR/config.php"

# Bypass Moodle's curl security block for local Keycloak proxy
echo "Bypassing Moodle cURL SSRF protection for local Keycloak proxy..."
sudo -u www-data php "$MOODLE_DIR/admin/cli/cfg.php" --name=curlsecurityallowedport --set="8080
8081"
sudo -u www-data php "$MOODLE_DIR/admin/cli/cfg.php" --name=curlsecurityblockedhosts --set="127.0.0.2"

# Start socat proxy so that PHP cURL requests to
# keycloak.teman-belajar.localhost:8081 (which resolves to 127.0.0.1
# inside the container due to the .localhost TLD) are forwarded to the
# actual Keycloak Docker service on its internal port.
echo "Starting Keycloak loopback proxy (socat)..."
socat TCP-LISTEN:8081,fork,bind=127.0.0.1 TCP:keycloak:8080 &

echo "Starting Apache..."
exec "$@"
