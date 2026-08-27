<?php
/**
 * Web service definitions for local_temanbelajar.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

$functions = array(
    'local_temanbelajar_resolve_federated_user' => array(
        'classname'   => 'local_temanbelajar\external\resolve_federated_user',
        'methodname'  => 'execute',
        'classpath'   => 'local/temanbelajar/classes/external/resolve_federated_user.php',
        'description' => 'Resolves a federated user to a local Moodle user by OIDC subject.',
        'type'        => 'read',
        'ajax'        => true,
        'services'    => array('teman_belajar_integration'),
    ),
    'local_temanbelajar_get_learning_analytics' => array(
        'classname'   => 'local_temanbelajar\external\get_learning_analytics',
        'methodname'  => 'execute',
        'classpath'   => 'local/temanbelajar/classes/external/get_learning_analytics.php',
        'description' => 'Gets privacy-safe learning analytics for an inclusive date range.',
        'type'        => 'read',
        'ajax'        => true,
        'services'    => array('teman_belajar_integration'),
    ),
    'local_temanbelajar_list_webinars' => array(
        'classname' => 'local_temanbelajar\external\list_webinars',
        'methodname' => 'execute',
        'description' => 'Lists learner-visible Moodle mod_zoom webinars using an allowlisted contract.',
        'type' => 'read',
        'ajax' => false,
        'services' => array('teman_belajar_integration'),
    ),
    'local_temanbelajar_get_webinar' => array(
        'classname' => 'local_temanbelajar\external\get_webinar',
        'methodname' => 'execute',
        'description' => 'Gets one learner-visible Moodle mod_zoom webinar.',
        'type' => 'read',
        'ajax' => false,
        'services' => array('teman_belajar_integration'),
    ),
    'local_temanbelajar_register_webinar' => array(
        'classname' => 'local_temanbelajar\external\register_webinar',
        'methodname' => 'execute',
        'description' => 'Atomically registers a learner for a Moodle mod_zoom webinar.',
        'type' => 'write',
        'ajax' => false,
        'services' => array('teman_belajar_integration'),
    ),
    'local_temanbelajar_cancel_webinar' => array(
        'classname' => 'local_temanbelajar\external\cancel_webinar',
        'methodname' => 'execute',
        'description' => 'Cancels a learner webinar registration before the session starts.',
        'type' => 'write',
        'ajax' => false,
        'services' => array('teman_belajar_integration'),
    ),
);

$services = array(
    'Teman Belajar Integration' => array(
        'functions' => array(
            'core_course_get_courses',
            'core_enrol_get_users_courses',
            'core_completion_get_course_completion_status',
            'gradereport_user_get_grade_items',
            'local_temanbelajar_resolve_federated_user',
            'local_temanbelajar_get_learning_analytics',
            'local_temanbelajar_list_webinars',
            'local_temanbelajar_get_webinar',
            'local_temanbelajar_register_webinar',
            'local_temanbelajar_cancel_webinar',
        ),
        'restrictedusers' => 1,
        'enabled' => 1,
        'shortname' => 'teman_belajar_integration'
    )
);


