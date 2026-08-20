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

// Keycloak delivers Front-Channel Logout in a cross-origin iframe. Moodle's
// core web session cookie is SameSite=Lax, so the browser may intentionally
// omit it from that iframe request. Expire the governed Moodle session cookie
// unconditionally after issuer/sid validation: this reconciles the browser on
// its next navigation without querying Moodle's database or modifying core.
setcookie(session_name(), '', [
    'expires' => time() - HOURSECS,
    'path' => $CFG->sessioncookiepath ?? '/',
    'domain' => $CFG->sessioncookiedomain ?? '',
    'secure' => is_moodle_cookie_secure(),
    'httponly' => true,
    'samesite' => 'Lax',
]);

http_response_code(204);
