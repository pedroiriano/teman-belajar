# trivy:ignore:DS-0002
FROM php:8.3-apache

# Install required system packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libxml2-dev \
    libsodium-dev \
    sudo \
    socat \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pgsql \
    pdo_pgsql \
    mysqli \
    pdo_mysql \
    gd \
    zip \
    intl \
    soap \
    sodium \
    opcache \
    exif

# Enable Apache mod_rewrite and update DocumentRoot
ENV APACHE_DOCUMENT_ROOT /var/www/html/public
RUN a2enmod rewrite \
    && sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && echo "AcceptPathInfo On" >> /etc/apache2/apache2.conf \
    # Portal and Admin use independent encrypted OIDC cookies on localhost;
    # cookie scope ignores ports, so Moodle receives both session envelopes.
    # Keep a finite local-only ceiling and cap the number of header fields.
    && echo "LimitRequestFieldSize 262144" >> /etc/apache2/apache2.conf \
    && echo "LimitRequestFields 64" >> /etc/apache2/apache2.conf

# Increase PHP limits for Moodle
RUN echo "memory_limit = 512M" > /usr/local/etc/php/conf.d/moodle.ini \
    && echo "upload_max_filesize = 100M" >> /usr/local/etc/php/conf.d/moodle.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/moodle.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/moodle.ini \
    && echo "max_input_vars = 5000" >> /usr/local/etc/php/conf.d/moodle.ini

# Create moodledata directory
RUN mkdir -p /var/www/moodledata \
    && chown -R www-data:www-data /var/www/moodledata \
    && chmod 2770 /var/www/moodledata

# Copy the TGZ file and extract it
COPY moodle.tgz /tmp/moodle.tgz
# mod_zoom v5.5.0, tag commit 2f1e5a88cd1e5f1d8cc9b9300990887764801821.
# The checksum makes the third-party Moodle dependency reproducible and
# fails the build closed if the upstream archive changes.
ADD --checksum=sha256:6d9d094d1b4eb8c295de2395b153d5096b718ba3a9dba4fb725fca7ff5580445 \
    https://github.com/jrchamp/moodle-mod_zoom/archive/refs/tags/v5.5.0.tar.gz \
    /tmp/mod_zoom-v5.5.0.tar.gz
RUN tar -xzf /tmp/moodle.tgz -C /var/www/ \
    && rm -rf /var/www/html \
    && mv /var/www/moodle /var/www/html \
    && mkdir -p /var/www/html/public/mod/zoom \
    && tar -xzf /tmp/mod_zoom-v5.5.0.tar.gz -C /var/www/html/public/mod/zoom --strip-components=1 \
    && rm /tmp/moodle.tgz \
    && rm /tmp/mod_zoom-v5.5.0.tar.gz \
    && chown -R www-data:www-data /var/www/html

# Copy the entrypoint script
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY sync-config.php /usr/local/bin/sync-config.php
RUN chmod 0755 /usr/local/bin/entrypoint.sh \
    && chmod 0644 /usr/local/bin/sync-config.php

# Expose HTTP port
EXPOSE 80

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["apache2-foreground"]

# trivy:ignore:AVD-DS-0002
# trivy:ignore:DS-0002
USER root
