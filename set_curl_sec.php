<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');

// Must be newline separated as per Moodle's admin setting type param_text
set_config('curlsecurityallowedport', "8080\n8081");
// Set dummy blocked host so it overrides the default array of local subnets
set_config('curlsecurityblockedhosts', "127.0.0.2");

echo "Config updated via set_config()\n";
