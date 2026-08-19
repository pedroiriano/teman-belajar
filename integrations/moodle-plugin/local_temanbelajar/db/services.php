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
        'description' => 'Gets learning analytics data for a specific date.',
        'type'        => 'read',
        'ajax'        => true,
        'services'    => array('teman_belajar_integration'),
    ),
);

$services = array(
    'teman_belajar_integration' => array(
        'functions' => array(
            'core_course_get_courses',
            'core_enrol_get_users_courses',
            'core_completion_get_course_completion_status',
            'gradereport_user_get_grade_items',
            'local_temanbelajar_resolve_federated_user',
            'local_temanbelajar_get_learning_analytics',
        ),
        'restrictedusers' => 1,
        'enabled' => 1,
        'shortname' => 'teman_belajar_integration'
    )
);


