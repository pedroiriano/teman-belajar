<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
$c = new \core\files\curl_security_helper();
$url = 'http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar/protocol/openid-connect/token';

$murl = new \moodle_url($url);
$host = $murl->get_host();
$port = $murl->get_port();

echo "Host: $host, Port: $port\n";

$r1 = new ReflectionMethod('core\files\curl_security_helper', 'port_is_blocked');
$r1->setAccessible(true);
echo "Port blocked: " . ($r1->invoke($c, $port) ? 'YES' : 'NO') . "\n";

$r2 = new ReflectionMethod('core\files\curl_security_helper', 'host_is_blocked');
$r2->setAccessible(true);
echo "Host blocked: " . ($r2->invoke($c, $host) ? 'YES' : 'NO') . "\n";
