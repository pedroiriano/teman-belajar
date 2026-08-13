<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
$c = new \core\files\curl_security_helper();
$r = new ReflectionMethod('core\files\curl_security_helper', 'get_allowed_ports');
$r->setAccessible(true);
var_dump($r->invoke($c));
