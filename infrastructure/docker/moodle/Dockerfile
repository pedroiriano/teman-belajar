FROM php:8.3-apache

# Install required system packages
RUN apt-get update && apt-get install -y \
    libpq-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libicu-dev \
    libxml2-dev \
    libsodium-dev \
    sudo \
    tar \
    && rm -rf /var/lib/apt/lists/*

# Configure and install PHP extensions
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pgsql \
    pdo_pgsql \
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
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

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
RUN tar -xzf /tmp/moodle.tgz -C /var/www/ \
    && rm -rf /var/www/html \
    && mv /var/www/moodle /var/www/html \
    && rm /tmp/moodle.tgz \
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
