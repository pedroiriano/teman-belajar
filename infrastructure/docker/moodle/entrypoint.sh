#!/bin/bash
set -euo pipefail

MOODLE_DIR="/var/www/html"
MOODLE_DATA_DIR="/var/www/moodledata"

: "${MOODLE_DATABASE_HOST:?MOODLE_DATABASE_HOST is required}"
: "${MOODLE_DATABASE_NAME:?MOODLE_DATABASE_NAME is required}"
: "${MOODLE_DATABASE_USER:?MOODLE_DATABASE_USER is required}"
: "${MOODLE_DATABASE_PASSWORD:?MOODLE_DATABASE_PASSWORD is required}"
: "${MOODLE_BASE_URL:?MOODLE_BASE_URL is required}"
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
else
    echo "Moodle is already configured."
    php /usr/local/bin/sync-config.php
    sudo -u www-data php "$MOODLE_DIR/admin/cli/upgrade.php" --non-interactive
fi

# config.php and moodledata are the only runtime-owned paths managed here.
# The plugin source is intentionally mounted read-only and must never be chowned.
chown www-data:www-data "$MOODLE_DIR/config.php"
chmod 0640 "$MOODLE_DIR/config.php"

echo "Starting Apache..."
exec "$@"
