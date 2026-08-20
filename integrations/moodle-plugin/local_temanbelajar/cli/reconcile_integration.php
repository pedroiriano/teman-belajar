<?php
// This file is part of Moodle - http://moodle.org/

define('CLI_SCRIPT', true);

require(dirname(__DIR__, 4) . '/config.php');
require_once($CFG->dirroot . '/admin/roles/lib.php');

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

$systemcontext = context_system::instance();
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
