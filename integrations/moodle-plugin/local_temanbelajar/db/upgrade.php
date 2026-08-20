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

    return true;
}
