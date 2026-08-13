<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
$c = new \core\files\curl_security_helper();
$r = new ReflectionMethod('core\files\curl_security_helper', 'address_explicitly_blocked');
$r->setAccessible(true);
echo "Is 192.168.65.254 blocked? " . ($r->invoke($c, '192.168.65.254') ? 'YES' : 'NO') . "\n";
