<?php
define('CLI_SCRIPT', true);
require(__DIR__ . '/config.php');
global $DB;

$linked_logins = $DB->get_records('auth_oauth2_linked_login');
echo "OAuth2 Linked Logins:\n";
print_r($linked_logins);

$users = $DB->get_records_sql("SELECT id, username, email, auth FROM {user} WHERE id > 2");
echo "\nUsers:\n";
print_r($users);
