<?php
// This file is part of Moodle - http://moodle.org/

namespace local_temanbelajar;

/**
 * Regression tests for federated login privilege boundaries.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 * @covers     \local_temanbelajar\observer
 */
final class observer_test extends \advanced_testcase {
    public function test_local_site_admin_login_is_allowed(): void {
        $this->resetAfterTest();

        $admin = get_admin();
        $event = \core\event\user_loggedin::create([
            'userid' => $admin->id,
            'objectid' => $admin->id,
            'other' => [
                'username' => $admin->username,
                'extrauserinfo' => [],
            ],
        ]);

        $this->assertFalse(observer::is_federated_site_admin_login($event));
    }

    public function test_federated_site_admin_login_is_blocked(): void {
        $this->resetAfterTest();

        $admin = get_admin();
        $this->setAdminUser();
        $event = \core\event\user_loggedin::create([
            'userid' => $admin->id,
            'objectid' => $admin->id,
            'other' => [
                'username' => $admin->username,
                'extrauserinfo' => [
                    'sub' => 'external-subject-for-regression-test',
                ],
            ],
        ]);

        $this->assertTrue(observer::is_federated_site_admin_login($event));
    }

    public function test_federated_system_manager_login_is_blocked(): void {
        global $DB;

        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $managerrole = $DB->get_field('role', 'id', ['archetype' => 'manager'], MUST_EXIST);
        role_assign($managerrole, $user->id, \context_system::instance()->id);
        accesslib_clear_all_caches(true);
        $event = \core\event\user_loggedin::create([
            'userid' => $user->id,
            'objectid' => $user->id,
            'other' => [
                'username' => $user->username,
                'extrauserinfo' => [
                    'sub' => 'external-manager-subject-for-regression-test',
                ],
            ],
        ]);

        $this->assertTrue(observer::is_federated_privileged_login($event));
    }

    public function test_only_dedicated_lms_administrator_claim_authorizes_federated_admin(): void {
        $this->resetAfterTest();

        $user = $this->getDataGenerator()->create_user();
        $portaladminevent = \core\event\user_loggedin::create([
            'userid' => $user->id,
            'objectid' => $user->id,
            'other' => [
                'username' => $user->username,
                'extrauserinfo' => ['teman_belajar_roles' => ['Portal Administrator']],
            ],
        ]);
        $lmsadminevent = \core\event\user_loggedin::create([
            'userid' => $user->id,
            'objectid' => $user->id,
            'other' => [
                'username' => $user->username,
                'extrauserinfo' => ['teman_belajar_roles' => ['LMS Administrator']],
            ],
        ]);

        $this->assertFalse(observer::has_federated_admin_role($portaladminevent));
        $this->assertTrue(observer::has_federated_admin_role($lmsadminevent));
    }

    public function test_recovery_identity_is_restored_after_oauth_profile_update(): void {
        $this->resetAfterTest();

        $admin = get_admin();
        $originalusername = getenv('MOODLE_ADMIN_USER');
        $originalemail = getenv('MOODLE_ADMIN_EMAIL');
        putenv('MOODLE_ADMIN_USER=' . $admin->username);
        putenv('MOODLE_ADMIN_EMAIL=moodle-recovery-test@example.invalid');

        try {
            $this->assertTrue(observer::restore_recovery_identity((int) $admin->id));
            $updated = \core_user::get_user($admin->id, 'id,email', MUST_EXIST);
            $this->assertSame('moodle-recovery-test@example.invalid', $updated->email);
        } finally {
            putenv($originalusername === false ? 'MOODLE_ADMIN_USER' : 'MOODLE_ADMIN_USER=' . $originalusername);
            putenv($originalemail === false ? 'MOODLE_ADMIN_EMAIL' : 'MOODLE_ADMIN_EMAIL=' . $originalemail);
        }
    }
}
