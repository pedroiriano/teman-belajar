<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
set_config('debug', 32767);
set_config('debugdisplay', 1);
echo "Debugging enabled.\n";
