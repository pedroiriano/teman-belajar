<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
$c = new \core\files\curl_security_helper();
echo "Is blocked: " . ($c->url_is_blocked('http://keycloak.teman-belajar.localhost:8081/realms/teman-belajar/protocol/openid-connect/token') ? 'YES' : 'NO') . "\n";
