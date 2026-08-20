<?php

declare(strict_types=1);

$configPath = '/var/www/html/config.php';
$settings = [
    'dbhost' => getenv('MOODLE_DATABASE_HOST'),
    'dbname' => getenv('MOODLE_DATABASE_NAME'),
    'dbuser' => getenv('MOODLE_DATABASE_USER'),
    'dbpass' => getenv('MOODLE_DATABASE_PASSWORD'),
    'wwwroot' => getenv('MOODLE_BASE_URL'),
    'dataroot' => '/var/www/moodledata',
];

$oauth2allowinsecure = filter_var(getenv('MOODLE_ALLOW_INSECURE_OAUTH2'), FILTER_VALIDATE_BOOLEAN);
$keycloakissuer = getenv('MOODLE_KEYCLOAK_ISSUER');
$postlogoutredirect = getenv('MOODLE_POST_LOGOUT_REDIRECT_URL');
$logoutbridgesecret = getenv('SSO_LOGOUT_BRIDGE_SECRET');
$portallogoutorigin = getenv('PORTAL_WEB_URL');
$adminlogoutorigin = getenv('ADMIN_WEB_URL');
if ($keycloakissuer === false || $keycloakissuer === '' || $postlogoutredirect === false || $postlogoutredirect === ''
        || $logoutbridgesecret === false || strlen($logoutbridgesecret) < 32
        || $portallogoutorigin === false || $portallogoutorigin === ''
        || $adminlogoutorigin === false || $adminlogoutorigin === '') {
    fwrite(STDERR, "Missing Moodle SSO runtime URL.\n");
    exit(1);
}

$config = file_get_contents($configPath);
if ($config === false) {
    fwrite(STDERR, "Unable to read Moodle config.php.\n");
    exit(1);
}

foreach ($settings as $property => $value) {
    if ($value === false || $value === '') {
        fwrite(STDERR, "Missing runtime value for Moodle {$property}.\n");
        exit(1);
    }

    $pattern = '/\$CFG->' . preg_quote($property, '/') . '\s*=\s*[^;]+;/';
    $replacement = '$CFG->' . $property . ' = ' . var_export($value, true) . ';';
    $updated = preg_replace($pattern, $replacement, $config, 1, $count);

    if ($updated === null || $count !== 1) {
        fwrite(STDERR, "Expected exactly one assignment for Moodle {$property}.\n");
        exit(1);
    }

    $config = $updated;
}

// Sync oauth2allowinsecure (boolean)
$pattern = '/\$CFG->oauth2allowinsecure\s*=\s*[^;]+;/';
$replacement = '$CFG->oauth2allowinsecure = ' . var_export($oauth2allowinsecure, true) . ';';
$config = preg_replace($pattern, $replacement, $config, 1, $count);
if ($count === 0) {
    // If not found, add it
    $config .= "\n\$CFG->oauth2allowinsecure = " . var_export($oauth2allowinsecure, true) . ";\n";
}

$managed = [
    'alternateloginurl' => rtrim((string) $settings['wwwroot'], '/') . '/local/temanbelajar/login.php',
    'forcelogin' => true,
    'local_temanbelajar_keycloakissuer' => $keycloakissuer,
    'local_temanbelajar_postlogoutredirect' => $postlogoutredirect,
    'local_temanbelajar_logoutbridgesecret' => $logoutbridgesecret,
    'local_temanbelajar_logoutreturnorigins' => rtrim($portallogoutorigin, '/') . '|' . rtrim($adminlogoutorigin, '/'),
];
foreach ($managed as $property => $value) {
    $pattern = '/\$CFG->' . preg_quote($property, '/') . '\s*=\s*[^;]+;/';
    $replacement = '$CFG->' . $property . ' = ' . var_export($value, true) . ';';
    $updated = preg_replace($pattern, $replacement, $config, 1, $count);
    if ($updated === null) {
        fwrite(STDERR, "Unable to synchronize Moodle {$property}.\n");
        exit(1);
    }
    $config = $count === 1 ? $updated : $config . "\n{$replacement}\n";
}

// Remove legacy curlsecurity overrides from config.php if they exist
$config = preg_replace('/\$CFG->curlsecurityallowedport\s*=\s*[^;]+;/', '', $config);
$config = preg_replace('/\$CFG->curlsecurityblockedhosts\s*=\s*[^;]+;/', '', $config);

$temporaryPath = $configPath . '.tmp';
if (file_put_contents($temporaryPath, $config, LOCK_EX) === false) {
    fwrite(STDERR, "Unable to write temporary Moodle config.php.\n");
    exit(1);
}

if (!rename($temporaryPath, $configPath)) {
    @unlink($temporaryPath);
    fwrite(STDERR, "Unable to replace Moodle config.php atomically.\n");
    exit(1);
}

chmod($configPath, 0640);
chown($configPath, 'www-data');
chgrp($configPath, 'www-data');

fwrite(STDOUT, "Moodle runtime configuration synchronized.\n");
