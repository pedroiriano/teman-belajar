<?php
/**
 * Web service definitions for local_temanbelajar.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$services = array(
    'Teman Belajar Integration' => array(
        'functions' => array(
            'core_course_get_courses',
            // Custom functions will be added here in TASK-005.
        ),
        'restrictedusers' => 1,
        'enabled' => 1,
        'shortname' => 'teman_belajar_integration'
    )
);
