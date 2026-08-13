<?php
/**
 * External function to resolve federated user identity
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_temanbelajar\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use moodle_exception;

defined('MOODLE_INTERNAL') || die();

class resolve_federated_user extends external_api {

    /**
     * Returns description of method parameters
     *
     * @return external_function_parameters
     */
    public static function execute_parameters() {
        return new external_function_parameters(
            array(
                'subject' => new external_value(PARAM_RAW, 'The OIDC Subject (sub) or mapped username of the federated user')
            )
        );
    }

    /**
     * Resolves the federated user based on OIDC subject.
     * Searches auth_oauth2_linked_login for the matching username (which holds the OIDC remote identity).
     *
     * @param string $subject
     * @return array
     */
    public static function execute($subject) {
        global $DB;

        // Parameter validation
        $params = self::validate_parameters(self::execute_parameters(),
            array('subject' => $subject));

        $subject = $params['subject'];

        if (empty($subject)) {
            throw new moodle_exception('invalidparameter', 'error', '', null, 'Subject cannot be empty');
        }

        // The auth_oauth2_linked_login table connects issuerid with the remote identity string ('username' column)
        $sql = "SELECT u.id, u.username, u.email
                  FROM {user} u
                  JOIN {auth_oauth2_linked_login} l ON l.userid = u.id
                 WHERE l.username = :subject";
                 
        $user = $DB->get_record_sql($sql, array('subject' => $subject), IGNORE_MISSING);

        if (!$user) {
            throw new moodle_exception('usernotmapped', 'local_temanbelajar', '', null, 'Federated identity not mapped to any local Moodle user');
        }

        return array(
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email
        );
    }

    /**
     * Returns description of method result value
     *
     * @return external_single_structure
     */
    public static function execute_returns() {
        return new external_single_structure(
            array(
                'id'       => new external_value(PARAM_INT, 'The internal Moodle user ID'),
                'username' => new external_value(PARAM_RAW, 'The internal Moodle username'),
                'email'    => new external_value(PARAM_RAW, 'The Moodle user email')
            )
        );
    }
}
