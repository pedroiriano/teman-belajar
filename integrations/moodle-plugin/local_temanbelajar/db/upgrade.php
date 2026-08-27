<?php
// This file is part of Moodle - http://moodle.org/

defined('MOODLE_INTERNAL') || die();

function xmldb_local_temanbelajar_upgrade($oldversion) {
    global $DB;

    if ($oldversion < 2026082002) {
        $service = $DB->get_record('external_services', [
            'shortname' => 'teman_belajar_integration',
        ]);
        if ($service) {
            if (!empty($service->component) && $service->component !== 'local_temanbelajar') {
                throw new moodle_exception('Existing Teman Belajar service is owned by another component');
            }
            $service->name = 'Teman Belajar Integration';
            $service->component = 'local_temanbelajar';
            $DB->update_record('external_services', $service);
        }

        upgrade_plugin_savepoint(true, 2026082002, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082003) {
        // Refresh event observers so federated identities can never inherit
        // Moodle Site Administrator from an existing linked login.
        upgrade_plugin_savepoint(true, 2026082003, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082004) {
        // Records the governed cross-origin front-channel cookie
        // reconciliation behavior in federated_logout.php.
        upgrade_plugin_savepoint(true, 2026082004, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082005) {
        // Records recovery-administrator identity reconciliation and cleanup
        // of prohibited OAuth2 links to Site Administrator accounts.
        upgrade_plugin_savepoint(true, 2026082005, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082006) {
        // Records exact recovery-username reconciliation and OAuth2 link
        // cleanup using Moodle user objects rather than array keys.
        upgrade_plugin_savepoint(true, 2026082006, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082007) {
        // Records idempotent recreation of a missing configured local recovery
        // account before the Site Administrator boundary is reconciled.
        upgrade_plugin_savepoint(true, 2026082007, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082008) {
        // Records fail-closed federated login handling for system-level
        // Manager drift in addition to the Site Administrator boundary.
        upgrade_plugin_savepoint(true, 2026082008, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082009) {
        // Records the explicit username-plus-LMS-Administrator entitlement for
        // the single approved federated Moodle Site Administrator.
        upgrade_plugin_savepoint(true, 2026082009, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082010) {
        // Records the signed top-level logout bridge used when browsers block
        // Moodle's third-party front-channel session cookie.
        upgrade_plugin_savepoint(true, 2026082010, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082011) {
        // Moodle-initiated logout now uses signed top-level Portal and Admin
        // hops. No persistent schema or capability change is required.
        upgrade_plugin_savepoint(true, 2026082011, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082700) {
        $dbman = $DB->get_manager();

        $policy = new xmldb_table('local_tb_webinar_policy');
        $policy->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $policy->add_field('cmid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $policy->add_field('capacity', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, null, '0');
        $policy->add_field('timecreated', XMLDB_TYPE_INTEGER, '12', null, XMLDB_NOTNULL);
        $policy->add_field('timemodified', XMLDB_TYPE_INTEGER, '12', null, XMLDB_NOTNULL);
        $policy->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $policy->add_key('cmid_fk', XMLDB_KEY_FOREIGN_UNIQUE, ['cmid'], 'course_modules', ['id']);
        if (!$dbman->table_exists($policy)) {
            $dbman->create_table($policy);
        }

        $registration = new xmldb_table('local_tb_webinar_reg');
        $registration->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $registration->add_field('cmid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $registration->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $registration->add_field('status', XMLDB_TYPE_CHAR, '10', null, XMLDB_NOTNULL, null, 'registered');
        $registration->add_field('idempotencykey', XMLDB_TYPE_CHAR, '64', null, XMLDB_NOTNULL);
        $registration->add_field('timecreated', XMLDB_TYPE_INTEGER, '12', null, XMLDB_NOTNULL);
        $registration->add_field('timemodified', XMLDB_TYPE_INTEGER, '12', null, XMLDB_NOTNULL);
        $registration->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $registration->add_key('cmid_fk', XMLDB_KEY_FOREIGN, ['cmid'], 'course_modules', ['id']);
        $registration->add_key('userid_fk', XMLDB_KEY_FOREIGN, ['userid'], 'user', ['id']);
        $registration->add_key('cmid_user_unique', XMLDB_KEY_UNIQUE, ['cmid', 'userid']);
        $registration->add_key('idempotency_unique', XMLDB_KEY_UNIQUE, ['idempotencykey']);
        $registration->add_index('cmid_status_idx', XMLDB_INDEX_NOTUNIQUE, ['cmid', 'status']);
        $registration->add_index('userid_status_idx', XMLDB_INDEX_NOTUNIQUE, ['userid', 'status']);
        if (!$dbman->table_exists($registration)) {
            $dbman->create_table($registration);
        }

        upgrade_plugin_savepoint(true, 2026082700, 'local', 'temanbelajar');
    }

    if ($oldversion < 2026082701) {
        $dbman = $DB->get_manager();
        $operations = new xmldb_table('local_tb_webinar_ops');
        $operations->add_field('id', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL, XMLDB_SEQUENCE);
        $operations->add_field('cmid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $operations->add_field('userid', XMLDB_TYPE_INTEGER, '10', null, XMLDB_NOTNULL);
        $operations->add_field('operation', XMLDB_TYPE_CHAR, '10', null, XMLDB_NOTNULL);
        $operations->add_field('idempotencykey', XMLDB_TYPE_CHAR, '64', null, XMLDB_NOTNULL);
        $operations->add_field('timecreated', XMLDB_TYPE_INTEGER, '12', null, XMLDB_NOTNULL);
        $operations->add_key('primary', XMLDB_KEY_PRIMARY, ['id']);
        $operations->add_key('cmid_fk', XMLDB_KEY_FOREIGN, ['cmid'], 'course_modules', ['id']);
        $operations->add_key('userid_fk', XMLDB_KEY_FOREIGN, ['userid'], 'user', ['id']);
        $operations->add_key('idempotency_unique', XMLDB_KEY_UNIQUE, ['idempotencykey']);
        $operations->add_index('user_cmid_time_idx', XMLDB_INDEX_NOTUNIQUE, ['userid', 'cmid', 'timecreated']);
        if (!$dbman->table_exists($operations)) {
            $dbman->create_table($operations);
        }

        upgrade_plugin_savepoint(true, 2026082701, 'local', 'temanbelajar');
    }

    return true;
}
