<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
require_once($CFG->dirroot.'/course/lib.php');
require_once($CFG->dirroot.'/user/lib.php');

echo "Deleting courses...\n";
$courses = $DB->get_records_select('course', 'id > 1');
foreach ($courses as $course) {
    echo "Deleting course: " . $course->fullname . "\n";
    delete_course($course, false);
}

echo "Deleting users...\n";
// id 1 = guest, id 2 = admin
$users = $DB->get_records_select('user', 'id > 2 AND deleted = 0');
foreach ($users as $user) {
    echo "Deleting user: " . $user->username . "\n";
    delete_user($user);
}

echo "Resetting custom menu items...\n";
set_config('custommenuitems', '', 'core');
// If a specific theme is used, reset it too:
$themes = $DB->get_records_sql("SELECT DISTINCT plugin FROM {config_plugins} WHERE name = 'custommenuitems'");
foreach ($themes as $theme) {
    set_config('custommenuitems', '', $theme->plugin);
}

echo "Done.\n";
