<?php
define('CLI_SCRIPT', true);
require('/var/www/html/config.php');
global $DB;
$c = $DB->get_record('course', ['id' => 4]);
echo "Category: " . ($c ? $c->category : 'NOT FOUND') . "\n";
