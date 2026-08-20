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

    return true;
}
