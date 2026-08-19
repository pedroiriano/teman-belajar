<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Event observers for local_temanbelajar.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

defined('MOODLE_INTERNAL') || die();

$observers = [
    [
        'eventname' => '\\core\\event\\user_loggedout',
        'callback' => '\\local_temanbelajar\\observer::user_loggedout',
        'priority' => 1000,
    ],
];
