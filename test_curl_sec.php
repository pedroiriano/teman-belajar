<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once('/var/www/html/public/lib/filelib.php');

$helper = new \core\files\curl_security_helper();
echo "Blocked hosts:\n";
var_dump($helper->get_blocked_hosts());
echo "Allowed ports:\n";
var_dump($helper->get_allowed_ports());
