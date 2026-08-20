<?php
namespace local_temanbelajar\external;

use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;
use core_external\external_single_structure;
use core_external\external_multiple_structure;
use context_system;

defined('MOODLE_INTERNAL') || die();

class get_learning_analytics extends external_api {

    public static function execute_parameters() {
        return new external_function_parameters([
            'start_date' => new external_value(PARAM_ALPHANUMEXT, 'Inclusive start date in YYYY-MM-DD format'),
            'end_date' => new external_value(PARAM_ALPHANUMEXT, 'Inclusive end date in YYYY-MM-DD format'),
        ]);
    }

    public static function execute($startdate, $enddate) {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), [
            'start_date' => $startdate,
            'end_date' => $enddate,
        ]);

        $context = context_system::instance();
        self::validate_context($context);
        require_capability('local/temanbelajar:readanalytics', $context);

        $timezone = new \DateTimeZone('Asia/Jakarta');
        $start = \DateTimeImmutable::createFromFormat('!Y-m-d', $params['start_date'], $timezone);
        $end = \DateTimeImmutable::createFromFormat('!Y-m-d', $params['end_date'], $timezone);
        if (!$start || !$end || $start->format('Y-m-d') !== $params['start_date'] ||
                $end->format('Y-m-d') !== $params['end_date'] || $end < $start) {
            throw new \invalid_parameter_exception('Invalid analytics date range');
        }
        if ($start->diff($end)->days > 365) {
            throw new \invalid_parameter_exception('Analytics date range cannot exceed 365 days');
        }

        $starttime = $start->getTimestamp();
        $endtime = $end->modify('+1 day')->getTimestamp();
        $studentroleids = $DB->get_fieldset_select('role', 'id', 'shortname = ?', ['student']);
        if (!$studentroleids) {
            return self::empty_result();
        }
        [$roleinsql, $roleparams] = $DB->get_in_or_equal($studentroleids, SQL_PARAMS_QM);
        $siteadminids = array_keys(get_admins());
        [$adminnotinsql, $adminparams] = $DB->get_in_or_equal(
            $siteadminids,
            SQL_PARAMS_QM,
            'admin',
            false,
            null
        );

        // The eligible cohort consists only of active student-role enrolments
        // in real courses that overlap the requested reporting window.
        $cohortsql = "SELECT DISTINCT ue.userid, e.courseid,
                            cc.timestarted, cc.timecompleted
                       FROM {user_enrolments} ue
                       JOIN {enrol} e ON e.id = ue.enrolid
                       JOIN {user} u ON u.id = ue.userid
                       JOIN {context} ctx ON ctx.contextlevel = ? AND ctx.instanceid = e.courseid
                       JOIN {role_assignments} ra ON ra.contextid = ctx.id AND ra.userid = ue.userid
                  LEFT JOIN {course_completions} cc ON cc.userid = ue.userid AND cc.course = e.courseid
                      WHERE e.courseid <> ?
                        AND ue.status = 0
                        AND u.deleted = 0 AND u.suspended = 0
                        AND ue.timestart < ?
                        AND (ue.timeend = 0 OR ue.timeend >= ?)
                        AND ue.userid $adminnotinsql
                        AND ra.roleid $roleinsql";
        $cohortparams = array_merge(
            [CONTEXT_COURSE, SITEID, $endtime, $starttime],
            $adminparams,
            $roleparams
        );

        $eligibleenrolments = 0;
        $starts = 0;
        $completions = 0;
        $cohort = $DB->get_recordset_sql($cohortsql, $cohortparams);
        foreach ($cohort as $enrolment) {
            $eligibleenrolments++;
            if (!empty($enrolment->timestarted) && $enrolment->timestarted >= $starttime &&
                    $enrolment->timestarted < $endtime) {
                $starts++;
            }
            if (!empty($enrolment->timecompleted) && $enrolment->timecompleted < $endtime) {
                $completions++;
            }
        }
        $cohort->close();

        $completionrate = $eligibleenrolments > 0
            ? round(($completions / $eligibleenrolments) * 100, 2)
            : 0.0;

        // Active learners are eligible learners with meaningful course
        // activity in the period. Staff, site admins, guests and service
        // accounts are excluded by the student cohort join above.
        $activesql = "SELECT DISTINCT l.userid
                        FROM {logstore_standard_log} l
                        JOIN ($cohortsql) cohort
                          ON cohort.userid = l.userid AND cohort.courseid = l.courseid
                       WHERE l.timecreated >= ? AND l.timecreated < ?
                         AND l.eventname IN (?, ?)";
        $activeparams = array_merge($cohortparams, [
            $starttime,
            $endtime,
            '\\core\\event\\course_viewed',
            '\\core\\event\\course_module_viewed',
        ]);
        $activelearners = 0;
        $active = $DB->get_recordset_sql($activesql, $activeparams);
        foreach ($active as $ignored) {
            $activelearners++;
        }
        $active->close();

        $coursessql = "SELECT l.courseid, COUNT(DISTINCT l.userid) AS unique_learners,
                             COUNT(l.id) AS accesses
                        FROM {logstore_standard_log} l
                        JOIN ($cohortsql) cohort
                          ON cohort.userid = l.userid AND cohort.courseid = l.courseid
                       WHERE l.timecreated >= ? AND l.timecreated < ?
                         AND l.eventname = ?
                    GROUP BY l.courseid
                    ORDER BY accesses DESC";
        $courseparams = array_merge($cohortparams, [
            $starttime,
            $endtime,
            '\\core\\event\\course_viewed',
        ]);
        $rs = $DB->get_recordset_sql($coursessql, $courseparams, 0, 50);

        $top_courses = [];
        foreach ($rs as $c) {
            $course = $DB->get_record('course', ['id' => $c->courseid], 'id, fullname');
            if ($course) {
                $top_courses[] = [
                    'course_id' => $course->id,
                    'course_name' => $course->fullname,
                    'accesses' => $c->accesses,
                    'unique_learners' => $c->unique_learners
                ];
            }
        }
        $rs->close();

        return [
            'active_learners' => $activelearners,
            'learning_starts' => $starts,
            'eligible_enrolments' => $eligibleenrolments,
            'completions' => $completions,
            'completion_rate' => $completionrate,
            'top_courses' => $top_courses
        ];
    }

    private static function empty_result() {
        return [
            'active_learners' => 0,
            'learning_starts' => 0,
            'eligible_enrolments' => 0,
            'completions' => 0,
            'completion_rate' => 0.0,
            'top_courses' => [],
        ];
    }

    public static function execute_returns() {
        return new external_single_structure([
            'active_learners' => new external_value(PARAM_INT, 'Number of active learners'),
            'learning_starts' => new external_value(PARAM_INT, 'Number of course starts'),
            'eligible_enrolments' => new external_value(PARAM_INT, 'Eligible learner-course enrolments in the cohort'),
            'completions' => new external_value(PARAM_INT, 'Number of course completions'),
            'completion_rate' => new external_value(PARAM_FLOAT, 'Completion rate percentage'),
            'top_courses' => new external_multiple_structure(
                new external_single_structure([
                    'course_id' => new external_value(PARAM_INT, 'Course ID'),
                    'course_name' => new external_value(PARAM_RAW, 'Course Name'),
                    'accesses' => new external_value(PARAM_INT, 'Number of accesses'),
                    'unique_learners' => new external_value(PARAM_INT, 'Number of unique learners')
                ])
            )
        ]);
    }
}
