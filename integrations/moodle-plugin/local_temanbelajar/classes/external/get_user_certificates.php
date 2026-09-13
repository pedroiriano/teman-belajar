<?php
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

namespace local_temanbelajar\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use moodle_url;

defined('MOODLE_INTERNAL') || die();

/**
 * External function to get user certificates issued by mod_customcert.
 *
 * @package local_temanbelajar
 */
final class get_user_certificates extends external_api {

    /**
     * Returns description of method parameters.
     *
     * @return external_function_parameters
     */
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'userid' => new external_value(PARAM_INT, 'The Moodle user ID'),
        ]);
    }

    /**
     * Retrieves issued certificates for a given user.
     *
     * @param int $userid
     * @return array
     */
    public static function execute(int $userid): array {
        global $DB, $CFG;

        $params = self::validate_parameters(self::execute_parameters(), [
            'userid' => $userid,
        ]);
        self::validate_context(context_system::instance());

        $uid = $params['userid'];
        if ($uid <= 0) {
            return [];
        }

        // Check if mod_customcert tables exist in this Moodle instance.
        $dbman = $DB->get_manager();
        if (!$dbman->table_exists('customcert') || !$dbman->table_exists('customcert_issues')) {
            return [];
        }

        $sql = "SELECT ci.id, ci.code, ci.timecreated, ci.customcertid,
                       c.id AS courseid, c.fullname AS coursename, c.shortname AS courseshortname,
                       cc.name AS certificatename
                  FROM {customcert_issues} ci
                  JOIN {customcert} cc ON cc.id = ci.customcertid
                  JOIN {course} c ON c.id = cc.course
                 WHERE ci.userid = :userid
              ORDER BY ci.timecreated DESC";

        $records = $DB->get_records_sql($sql, ['userid' => $uid]);
        $results = [];

        foreach ($records as $rec) {
            $verifyurl = new moodle_url('/mod/customcert/verify_certificate.php', [
                'code' => $rec->code,
            ]);
            $downloadurl = new moodle_url('/mod/customcert/my_certificates.php', [
                'userid' => $uid,
                'certificateid' => $rec->customcertid,
                'downloadcert' => 1,
            ]);

            $results[] = [
                'id' => (int) $rec->id,
                'customcertid' => (int) $rec->customcertid,
                'courseid' => (int) $rec->courseid,
                'coursename' => (string) $rec->coursename,
                'courseshortname' => (string) $rec->courseshortname,
                'certificatename' => (string) $rec->certificatename,
                'code' => (string) $rec->code,
                'timecreated' => (int) $rec->timecreated,
                'downloadurl' => $downloadurl->out(false),
                'verifyurl' => $verifyurl->out(false),
            ];
        }

        return $results;
    }

    /**
     * Returns description of method result value.
     *
     * @return external_multiple_structure
     */
    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(
            new external_single_structure([
                'id' => new external_value(PARAM_INT, 'Issue ID'),
                'customcertid' => new external_value(PARAM_INT, 'Customcert activity ID'),
                'courseid' => new external_value(PARAM_INT, 'Course ID'),
                'coursename' => new external_value(PARAM_TEXT, 'Full name of the course'),
                'courseshortname' => new external_value(PARAM_TEXT, 'Short name of the course'),
                'certificatename' => new external_value(PARAM_TEXT, 'Certificate name'),
                'code' => new external_value(PARAM_TEXT, 'Verification code'),
                'timecreated' => new external_value(PARAM_INT, 'Timestamp when certificate was issued'),
                'downloadurl' => new external_value(PARAM_URL, 'URL to download certificate PDF'),
                'verifyurl' => new external_value(PARAM_URL, 'URL to verify certificate authenticity'),
            ])
        );
    }
}
