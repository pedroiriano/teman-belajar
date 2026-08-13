<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
global $DB;

$categories = $DB->get_records('course_categories', null, '', 'id, name');
foreach ($categories as $c) {
    echo "Category: {$c->id} - {$c->name}\n";
}

$courses = $DB->get_records('course', null, '', 'id, shortname, fullname');
foreach ($courses as $c) {
    echo "Course: {$c->id} - {$c->shortname}\n";
}
