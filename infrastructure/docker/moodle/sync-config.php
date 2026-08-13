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
