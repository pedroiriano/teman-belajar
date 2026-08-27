<?php
/**
 * Strings for component 'local_temanbelajar', language 'en'
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$string['pluginname'] = 'Teman Belajar Integration';
$string['analyticsreaderrole'] = 'Teman Belajar analytics reader';
$string['analyticsreaderroledescription'] = 'Least-privilege system role for the Teman Belajar analytics Web Service.';
$string['federatedsiteadminblocked'] = 'Federated login cannot use a privileged Moodle administrator account. Use the separate local recovery administrator or contact the platform administrator.';
$string['keycloakissuermissing'] = 'The Teman Belajar Keycloak login provider is not available. Contact the platform administrator.';
$string['privacy:metadata:registration'] = 'Webinar registration state owned by Moodle.';
$string['privacy:metadata:registration:cmid'] = 'The Zoom course activity registered by the learner.';
$string['privacy:metadata:registration:userid'] = 'The learner who registered.';
$string['privacy:metadata:registration:status'] = 'The registration or cancellation state.';
$string['privacy:metadata:registration:idempotencykey'] = 'A retry-safe opaque operation key.';
$string['privacy:metadata:registration:timemodified'] = 'When the registration state last changed.';
$string['privacy:metadata:operation'] = 'The immutable mutation ledger used to make webinar registration and cancellation retries safe.';
$string['privacy:metadata:operation:type'] = 'The registration or cancellation operation.';
$string['privacy:metadata:operation:timecreated'] = 'The time when the operation was accepted.';
$string['purgewebinarattendance'] = 'Purge expired webinar attendance rows';
$string['webinarcapacity'] = 'Zoom webinar capacity';
$string['webinarcapacity_help'] = 'Maximum registered learners per Zoom webinar. Keep 0 until the licensed tenant capacity is confirmed; registration fails closed while it is 0.';
