<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
global $DB;

$courses = $DB->get_records_list('course', 'id', [7, 8, 9]);
foreach ($courses as $c) {
    echo "Course {$c->id}: {$c->shortname} (Category: {$c->category})\n";
}
