<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
$c = new \core\files\curl_security_helper();
$r = new ReflectionMethod('core\files\curl_security_helper', 'get_host_list_by_name');
$r->setAccessible(true);
$ips = $r->invoke($c, 'keycloak.teman-belajar.localhost');
echo "Resolved IPs for keycloak.teman-belajar.localhost: \n";
var_dump($ips);

$ips2 = gethostbynamel('keycloak.teman-belajar.localhost');
echo "gethostbynamel: \n";
var_dump($ips2);
