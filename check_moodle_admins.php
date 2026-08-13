<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
global $DB;
$users = $DB->get_records('user', ['email' => 'admin@temanbelajar.local'], '', 'id, username, email, auth');
print_r($users);
$admins = get_admins();
foreach ($admins as $admin) {
    echo "Site Admin: {$admin->id} - {$admin->username} ({$admin->email})\n";
}
