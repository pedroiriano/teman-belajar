<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Starts the governed Keycloak OAuth2 login flow.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

$systemcontext = context_system::instance();
$PAGE->set_context($systemcontext);
$PAGE->set_url(new moodle_url('/local/temanbelajar/login.php'));

if (isloggedin() && !isguestuser()) {
    redirect(!empty($SESSION->wantsurl) ? $SESSION->wantsurl : $CFG->wwwroot . '/my/');
}

$issuer = null;
foreach (\core\oauth2\api::get_all_issuers(true) as $candidate) {
    if ($candidate->get('clientid') === 'teman-belajar-moodle' && $candidate->is_available_for_login()) {
        $issuer = $candidate;
        break;
    }
}

if ($issuer === null) {
    throw new moodle_exception('keycloakissuermissing', 'local_temanbelajar');
}

$wantsurl = !empty($SESSION->wantsurl) ? (string) $SESSION->wantsurl : '';
redirect(new moodle_url('/auth/oauth2/login.php', [
    'id' => $issuer->get('id'),
    'sesskey' => sesskey(),
    'wantsurl' => $wantsurl,
]));
