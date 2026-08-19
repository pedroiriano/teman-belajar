<?php
defined('MOODLE_INTERNAL') || die();

$capabilities = [
    'local/temanbelajar:readanalytics' => [
        'riskbitmask' => RISK_DATALOSS,
        'captype' => 'read',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes' => [
            'manager' => CAP_ALLOW
        ]
    ],
];
