<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
$c = new \core\files\curl_security_helper();
print_r($c->get_blocked_hosts());
print_r($c->get_allowed_ports());
