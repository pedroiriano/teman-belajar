<?php
// This file is part of Moodle - http://moodle.org/

define('CLI_SCRIPT', true);

require(dirname(__DIR__, 4) . '/config.php');
require_once($CFG->dirroot . '/admin/roles/lib.php');
require_once($CFG->dirroot . '/user/lib.php');

$recoveryusername = trim((string) getenv('MOODLE_ADMIN_USER'));
$recoveryemail = trim(core_text::strtolower((string) getenv('MOODLE_ADMIN_EMAIL')));
$federatedadminusername = trim((string) getenv('MOODLE_FEDERATED_ADMIN_USER'));
if ($recoveryusername === '' || !validate_email($recoveryemail)
        || $federatedadminusername === '' || $federatedadminusername === $recoveryusername) {
    throw new moodle_exception('The governed Moodle recovery administrator identity is invalid');
}

$recoveryadmin = core_user::get_user_by_username($recoveryusername);
$createdrecoveryadmin = false;
$adoptedrecoveryadmin = false;
if (!$recoveryadmin) {
    $recoverypassword = (string) getenv('MOODLE_ADMIN_PASSWORD');
    if ($recoverypassword === '') {
        throw new moodle_exception('The governed Moodle recovery administrator password is missing');
    }
    $emailowner = core_user::get_user_by_email($recoveryemail, '*', null, IGNORE_MULTIPLE);
    if ($emailowner) {
        if ($emailowner->deleted || $emailowner->suspended || $emailowner->auth !== 'manual'
                || !is_siteadmin($emailowner->id)) {
            throw new moodle_exception(
                'The governed Moodle recovery administrator email is owned by an account that cannot be safely adopted'
            );
        }
        user_update_user((object) [
            'id' => $emailowner->id,
            'username' => $recoveryusername,
            'password' => $recoverypassword,
        ], true, true);
        $recoveryadmin = core_user::get_user($emailowner->id, '*', MUST_EXIST);
        $adoptedrecoveryadmin = true;
    } else {
        $recoveryadminid = user_create_user((object) [
            'auth' => 'manual',
            'confirmed' => 1,
            'mnethostid' => $CFG->mnet_localhost_id,
            'username' => $recoveryusername,
            'firstname' => 'Moodle',
            'lastname' => 'Recovery Administrator',
            'email' => $recoveryemail,
            'password' => $recoverypassword,
        ], true, true);
        $recoveryadmin = core_user::get_user($recoveryadminid, '*', MUST_EXIST);
        $createdrecoveryadmin = true;
    }
    unset($recoverypassword);
}
if ($recoveryadmin->deleted || $recoveryadmin->suspended || $recoveryadmin->auth !== 'manual') {
    $recoverydrift = $recoveryadmin->deleted ? 'deleted'
        : ($recoveryadmin->suspended ? 'suspended' : 'non-manual-auth');
    throw new moodle_exception(
        'The governed Moodle recovery administrator must resolve to an active local manual account; drift=' . $recoverydrift
    );
}

$previoussiteadmins = get_admins();
$previoussiteadminids = array_map(
    static fn(stdClass $siteadmin): int => (int) $siteadmin->id,
    $previoussiteadmins
);
$recoveryadminid = (int) $recoveryadmin->id;
$federatedadmin = core_user::get_user_by_username($federatedadminusername);
$federatedadminid = null;
if ($federatedadmin) {
    if ($federatedadmin->deleted || $federatedadmin->suspended
            || !\auth_oauth2\linked_login::get_records(['userid' => $federatedadmin->id])) {
        throw new moodle_exception(
            'The configured federated Moodle administrator must be active and linked through OAuth2'
        );
    }
    $federatedadminid = (int) $federatedadmin->id;
}
$approvedsiteadminids = [$recoveryadminid];
if ($federatedadminid !== null) {
    $approvedsiteadminids[] = $federatedadminid;
}
$removedsiteadminassignments = count(array_filter(
    $previoussiteadminids,
    static fn(int $siteadminid): bool => !in_array($siteadminid, $approvedsiteadminids, true)
));
sort($previoussiteadminids);
sort($approvedsiteadminids);
if ($previoussiteadminids !== $approvedsiteadminids) {
    set_config('siteadmins', implode(',', $approvedsiteadminids));
    accesslib_clear_all_caches(true);
}

// A federated user does not need to be listed in `siteadmins` to gain the
// administration UI: a Manager role assignment at system context is enough.
// Site Administrator comes only from the local recovery identity or the exact
// configured federated administrator. Remove every non-recovery Manager
// assignment from the system context so the explicit Site Administrator
// boundary remains authoritative. Keep
// lower-privilege and component-owned roles (including the analytics reader)
// intact.
$systemcontext = context_system::instance();
$managerroles = $DB->get_records('role', ['archetype' => 'manager'], '', 'id');
$managerroleids = array_map('intval', array_keys($managerroles));
$removedsystemmanagerassignments = 0;
if ($managerroleids !== []) {
    foreach ($DB->get_records('role_assignments', ['contextid' => $systemcontext->id]) as $assignment) {
        if ((int) $assignment->userid === $recoveryadminid
                || !in_array((int) $assignment->roleid, $managerroleids, true)) {
            continue;
        }
        role_unassign(
            (int) $assignment->roleid,
            (int) $assignment->userid,
            (int) $assignment->contextid,
            (string) $assignment->component,
            (int) $assignment->itemid
        );
        $removedsystemmanagerassignments++;
    }
    if ($removedsystemmanagerassignments > 0) {
        accesslib_clear_all_caches(true);
    }
}

$emailowner = core_user::get_user_by_email($recoveryemail, 'id', null, IGNORE_MULTIPLE);
if ($emailowner && (int) $emailowner->id !== (int) $recoveryadmin->id) {
    throw new moodle_exception('The governed Moodle recovery administrator email is already in use');
}

if (core_text::strtolower($recoveryadmin->email) !== $recoveryemail) {
    user_update_user((object) [
        'id' => $recoveryadmin->id,
        'email' => $recoveryemail,
    ], false, true);
}

$removedadminlinks = 0;
$linkcleanupids = array_unique([
    $recoveryadminid,
    ...array_filter(
        $previoussiteadminids,
        static fn(int $siteadminid): bool => $siteadminid !== $federatedadminid
    ),
]);
foreach ($linkcleanupids as $siteadminid) {
    foreach (\auth_oauth2\linked_login::get_records(['userid' => $siteadminid]) as $linkedlogin) {
        $linkedlogin->delete();
        $removedadminlinks++;
    }
}

$service = $DB->get_record(
    'external_services',
    ['shortname' => 'teman_belajar_integration'],
    '*',
    MUST_EXIST
);

if (!$DB->record_exists('external_services_functions', [
        'externalserviceid' => $service->id,
        'functionname' => 'local_temanbelajar_get_learning_analytics',
    ])) {
    throw new moodle_exception('Analytics function is not linked to the Teman Belajar integration service');
}

$roleshortname = 'temanbelajar_analytics_reader';
$role = $DB->get_record('role', ['shortname' => $roleshortname]);
if (!$role) {
    $roleid = create_role(
        get_string('analyticsreaderrole', 'local_temanbelajar'),
        $roleshortname,
        get_string('analyticsreaderroledescription', 'local_temanbelajar')
    );
    $role = $DB->get_record('role', ['id' => $roleid], '*', MUST_EXIST);
}

set_role_contextlevels($role->id, [CONTEXT_SYSTEM]);
assign_capability(
    'local/temanbelajar:readanalytics',
    CAP_ALLOW,
    $role->id,
    $systemcontext->id,
    true
);

$tokens = $DB->get_records('external_tokens', ['externalserviceid' => $service->id]);
foreach ($tokens as $token) {
    role_assign(
        $role->id,
        $token->userid,
        $systemcontext->id,
        'local_temanbelajar'
    );
}

echo 'Teman Belajar integration capability reconciled for ' . count($tokens) . " service user(s).\n";
echo 'Moodle recovery administrator account reconciled; created ' . ($createdrecoveryadmin ? '1' : '0') . " local account(s).\n";
echo 'Moodle recovery administrator drift reconciled; adopted ' . ($adoptedrecoveryadmin ? '1' : '0') . " local account(s).\n";
echo 'Moodle recovery administrator identity reconciled; removed ' . $removedadminlinks . " prohibited federated link(s).\n";
echo 'Moodle Site Administrator boundary reconciled; removed ' . $removedsiteadminassignments . " non-recovery assignment(s).\n";
echo 'Moodle federated administrator boundary reconciled; approved ' . ($federatedadminid === null ? '0' : '1') . " explicit account(s).\n";
echo 'Moodle system Manager boundary reconciled; removed ' . $removedsystemmanagerassignments . " non-recovery assignment(s).\n";
