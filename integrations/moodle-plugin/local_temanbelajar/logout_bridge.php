<?php
// This file is part of Moodle - http://moodle.org/

/**
 * Signed top-level logout bridge for Portal/Admin initiated global logout.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

require_once(__DIR__ . '/../../config.php');

$returnurl = optional_param('return', '', PARAM_URL);
$issuedat = optional_param('ts', 0, PARAM_INT);
$nonce = optional_param('nonce', '', PARAM_ALPHANUMEXT);
$signature = optional_param('sig', '', PARAM_ALPHANUM);
$secret = (string) ($CFG->local_temanbelajar_logoutbridgesecret ?? '');
$allowedorigins = explode('|', (string) ($CFG->local_temanbelajar_logoutreturnorigins ?? ''));
$allowedreturns = array_map(
    static fn(string $origin): string => rtrim($origin, '/') . '/api/auth/federated-logout?bridge=1',
    array_filter($allowedorigins)
);

header('Cache-Control: no-store');
$payload = $returnurl . "\n" . $issuedat . "\n" . $nonce;
$expectedsignature = $secret === '' ? '' : hash_hmac('sha256', $payload, $secret);
$fresh = $issuedat > 0 && abs(time() - $issuedat) <= 60;
$valid = strlen($secret) >= 32
    && in_array($returnurl, $allowedreturns, true)
    && $fresh
    && preg_match('/^[a-f0-9]{64}$/D', $signature) === 1
    && hash_equals($expectedsignature, $signature);
if (!$valid) {
    http_response_code(400);
    echo 'Invalid logout request.';
    exit;
}

if (isloggedin() && !isguestuser()) {
    require_logout();
}
setcookie(session_name(), '', [
    'expires' => time() - HOURSECS,
    'path' => $CFG->sessioncookiepath ?? '/',
    'domain' => $CFG->sessioncookiedomain ?? '',
    'secure' => is_moodle_cookie_secure(),
    'httponly' => true,
    'samesite' => 'Lax',
]);

header('Location: ' . $returnurl, true, 303);
exit;
