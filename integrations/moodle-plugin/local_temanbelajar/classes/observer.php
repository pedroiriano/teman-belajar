<?php
// This file is part of Moodle - http://moodle.org/

namespace local_temanbelajar;

/**
 * Coordinates Moodle-initiated logout with the central Keycloak session.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
final class observer {
    /**
     * Redirect an interactive Moodle logout through Keycloak.
     *
     * @param \core\event\user_loggedout $event Logout event.
     */
    public static function user_loggedout(\core\event\user_loggedout $event): void {
        global $CFG, $redirect;

        if ((defined('CLI_SCRIPT') && CLI_SCRIPT) || (defined('WS_SERVER') && WS_SERVER)) {
            return;
        }

        $issuer = $CFG->local_temanbelajar_keycloakissuer ?? '';
        $postlogout = $CFG->local_temanbelajar_postlogoutredirect ?? '';
        if (!self::is_allowed_url($issuer) || !self::is_allowed_url($postlogout)) {
            return;
        }

        $redirect = (new \moodle_url(rtrim($issuer, '/') . '/protocol/openid-connect/logout', [
            'client_id' => 'teman-belajar-moodle',
            'post_logout_redirect_uri' => $postlogout,
        ]))->out(false);
    }

    /**
     * Only use absolute HTTP(S) values provisioned by the environment.
     */
    private static function is_allowed_url(string $value): bool {
        $parts = parse_url($value);
        return is_array($parts)
            && isset($parts['scheme'], $parts['host'])
            && in_array($parts['scheme'], ['http', 'https'], true);
    }
}
