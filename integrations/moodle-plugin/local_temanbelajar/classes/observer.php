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
    private const FEDERATED_ADMIN_ROLE = 'LMS Administrator';

    /**
     * Fail closed when a federated identity resolves to a Moodle administrator.
     *
     * Moodle core permits OAuth2 identities to link to an existing account by
     * email. A recovery administrator must remain a separate, local-only
     * identity, so an OAuth2 login must never inherit Site Administrator.
     *
     * @param \core\event\user_loggedin $event Login event.
     * @throws \moodle_exception When a federated login targets a site admin.
     */
    public static function user_loggedin(\core\event\user_loggedin $event): void {
        if (!self::is_federated_login($event)) {
            return;
        }

        $user = \core_user::get_user($event->userid, 'id,username,auth,deleted,suspended');
        if (!$user || $user->deleted || $user->suspended) {
            self::deny_federated_admin_login($event->userid);
        }

        if (self::is_approved_federated_admin($event, $user)) {
            self::grant_site_administrator($event->userid);
            return;
        }

        // Role removal is fail-closed on the next federated login: revoke a
        // stale Site Administrator grant before evaluating other privilege
        // paths. System-level Manager drift is still blocked below.
        self::revoke_site_administrator($event->userid);
        if (!self::has_administrative_capability($event->userid)) {
            return;
        }

        self::deny_federated_admin_login($event->userid);
    }

    /**
     * Destroy a prohibited federated administrative session.
     */
    private static function deny_federated_admin_login(int $userid): void {

        // Moodle core has already persisted an email-matched linked login by
        // the time this event runs. Self-heal that prohibited mapping before
        // destroying the privileged session. Do not log identity claims.
        foreach (\auth_oauth2\linked_login::get_records(['userid' => $userid]) as $linkedlogin) {
            $linkedlogin->delete();
        }
        self::restore_recovery_identity($userid);
        \core\session\manager::terminate_current();
        http_response_code(403);
        header('Content-Type: text/plain; charset=utf-8');
        echo get_string('federatedsiteadminblocked', 'local_temanbelajar');
        exit;
    }

    /**
     * Detect the prohibited identity boundary without inspecting claim values.
     *
     * @param \core\event\user_loggedin $event Login event.
     * @return bool
     * @internal
     */
    public static function is_federated_site_admin_login(\core\event\user_loggedin $event): bool {
        return self::is_federated_privileged_login($event);
    }

    /**
     * Detect Site Administrator and system-level Manager capability drift.
     *
     * A Manager assignment at system context exposes Moodle administration
     * even when the account is absent from the `siteadmins` configuration.
     * Federated identities must fail closed for both privilege paths.
     *
     * @param \core\event\user_loggedin $event Login event.
     * @return bool
     * @internal
     */
    public static function is_federated_privileged_login(\core\event\user_loggedin $event): bool {
        if (!self::is_federated_login($event)) {
            return false;
        }
        $user = \core_user::get_user($event->userid, 'id,username,auth,deleted,suspended');
        return !$user
            || (!self::is_approved_federated_admin($event, $user)
                && self::has_administrative_capability($event->userid));
    }

    /**
     * Require both the exact configured Moodle username and the dedicated
     * Keycloak product role. Portal Administrator alone never qualifies.
     *
     * @param \core\event\user_loggedin $event Login event.
     * @param \stdClass $user Moodle user.
     * @return bool
     * @internal
     */
    public static function is_approved_federated_admin(
        \core\event\user_loggedin $event,
        \stdClass $user
    ): bool {
        $approvedusername = trim((string) getenv('MOODLE_FEDERATED_ADMIN_USER'));
        if ($approvedusername === '' || !hash_equals($approvedusername, (string) $user->username)) {
            return false;
        }
        if (!\auth_oauth2\linked_login::get_records(['userid' => $event->userid])) {
            return false;
        }

        return self::has_federated_admin_role($event);
    }

    /**
     * Read only the dedicated Keycloak claim emitted for the Moodle client.
     *
     * @param \core\event\user_loggedin $event Login event.
     * @return bool
     * @internal
     */
    public static function has_federated_admin_role(\core\event\user_loggedin $event): bool {
        $extrauserinfo = $event->other['extrauserinfo'] ?? [];
        $roles = is_array($extrauserinfo) ? ($extrauserinfo['teman_belajar_roles'] ?? []) : [];
        if (is_string($roles)) {
            $roles = [$roles];
        }
        return is_array($roles) && in_array(self::FEDERATED_ADMIN_ROLE, $roles, true);
    }

    /**
     * Whether a login event carries federated identity information.
     */
    private static function is_federated_login(\core\event\user_loggedin $event): bool {
        $extrauserinfo = $event->other['extrauserinfo'] ?? [];
        return is_array($extrauserinfo) && $extrauserinfo !== [];
    }

    /**
     * Detect either Moodle Site Administrator or Manager-equivalent access.
     */
    private static function has_administrative_capability(int $userid): bool {
        return is_siteadmin($userid)
            || has_capability('moodle/site:config', \context_system::instance(), $userid, false);
    }

    /**
     * Grant Site Administrator without replacing the local recovery account.
     */
    private static function grant_site_administrator(int $userid): void {
        $adminids = array_map(
            static fn(\stdClass $admin): int => (int) $admin->id,
            get_admins()
        );
        if (in_array($userid, $adminids, true)) {
            return;
        }
        $adminids[] = $userid;
        set_config('siteadmins', implode(',', array_unique($adminids)));
        accesslib_clear_all_caches(true);
    }

    /**
     * Remove a stale federated Site Administrator grant while preserving all
     * other configured administrators (especially the local recovery account).
     */
    private static function revoke_site_administrator(int $userid): void {
        if (!is_siteadmin($userid)) {
            return;
        }
        $adminids = array_values(array_filter(
            array_map(static fn(\stdClass $admin): int => (int) $admin->id, get_admins()),
            static fn(int $adminid): bool => $adminid !== $userid
        ));
        set_config('siteadmins', implode(',', array_unique($adminids)));
        accesslib_clear_all_caches(true);
    }

    /**
     * Restore the governed local recovery identity after Moodle OAuth2 updates
     * an email-matched account before the login event is emitted.
     *
     * Only the exact configured recovery username may be repaired. Other Site
     * Administrators remain blocked but are never silently rewritten.
     *
     * @param int $userid Moodle user id.
     * @return bool Whether the recovery email was already correct or restored.
     * @internal
     */
    public static function restore_recovery_identity(int $userid): bool {
        global $CFG;

        $recoveryusername = trim((string) getenv('MOODLE_ADMIN_USER'));
        $recoveryemail = trim(core_text::strtolower((string) getenv('MOODLE_ADMIN_EMAIL')));
        if ($recoveryusername === '' || !validate_email($recoveryemail)) {
            return false;
        }

        $user = \core_user::get_user($userid);
        if (!$user || $user->username !== $recoveryusername || !is_siteadmin($userid)) {
            return false;
        }

        $emailowner = \core_user::get_user_by_email($recoveryemail, 'id', null, IGNORE_MULTIPLE);
        if ($emailowner && (int) $emailowner->id !== $userid) {
            return false;
        }
        if (core_text::strtolower($user->email) === $recoveryemail) {
            return true;
        }

        require_once($CFG->dirroot . '/user/lib.php');
        user_update_user((object) ['id' => $userid, 'email' => $recoveryemail], false, true);
        return true;
    }

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

        $issuer = (string) ($CFG->local_temanbelajar_keycloakissuer ?? '');
        $postlogout = (string) ($CFG->local_temanbelajar_postlogoutredirect ?? '');
        $secret = (string) ($CFG->local_temanbelajar_logoutbridgesecret ?? '');
        $origins = explode('|', (string) ($CFG->local_temanbelajar_logoutreturnorigins ?? ''));
        if (count($origins) !== 2 || strlen($secret) < 32
                || !self::is_allowed_url($issuer) || !self::is_allowed_url($postlogout)
                || !self::is_allowed_url($origins[0]) || !self::is_allowed_url($origins[1])) {
            return;
        }

        $keycloaklogout = (new \moodle_url(rtrim($issuer, '/') . '/protocol/openid-connect/logout', [
            'client_id' => 'teman-belajar-moodle',
            'post_logout_redirect_uri' => $postlogout,
        ]))->out(false);
        $adminbridge = self::create_signed_logout_bridge(
            $origins[1],
            $keycloaklogout,
            $secret
        );
        $redirect = self::create_signed_logout_bridge($origins[0], $adminbridge, $secret);
    }

    /**
     * Create one short-lived, signed top-level web logout hop.
     */
    private static function create_signed_logout_bridge(string $origin, string $returnurl, string $secret): string {
        $issuedat = (string) time();
        $bytes = random_bytes(16);
        $bytes[6] = chr((ord($bytes[6]) & 0x0f) | 0x40);
        $bytes[8] = chr((ord($bytes[8]) & 0x3f) | 0x80);
        $hex = bin2hex($bytes);
        $nonce = substr($hex, 0, 8) . '-' . substr($hex, 8, 4) . '-' . substr($hex, 12, 4)
            . '-' . substr($hex, 16, 4) . '-' . substr($hex, 20, 12);
        $payload = $returnurl . "\n" . $issuedat . "\n" . $nonce;
        $query = http_build_query([
            'return' => $returnurl,
            'ts' => $issuedat,
            'nonce' => $nonce,
            'sig' => hash_hmac('sha256', $payload, $secret),
        ], '', '&', PHP_QUERY_RFC3986);
        return rtrim($origin, '/') . '/api/auth/moodle-logout-bridge?' . $query;
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
