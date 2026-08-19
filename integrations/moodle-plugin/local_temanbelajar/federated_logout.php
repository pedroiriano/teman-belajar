<?php
// This file is part of Moodle - http://moodle.org/

/**
 * OpenID Connect front-channel logout receiver.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

$issuer = optional_param('iss', '', PARAM_URL);
$sessionid = optional_param('sid', '', PARAM_ALPHANUMEXT);
$expectedissuer = $CFG->local_temanbelajar_keycloakissuer ?? '';

header('Cache-Control: no-store');
if ($expectedissuer === '' || $issuer === '' || $sessionid === '' || !hash_equals($expectedissuer, $issuer)) {
    http_response_code(204);
    exit;
}

if (isloggedin() && !isguestuser()) {
    require_logout();
}

http_response_code(204);
