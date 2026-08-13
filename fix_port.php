<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
set_config('curlsecurityallowedport', "8080\n8081");
echo "Done\n";
