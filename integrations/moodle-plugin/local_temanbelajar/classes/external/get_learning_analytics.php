<?php
namespace local_temanbelajar\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;
use external_multiple_structure;
use context_system;

defined('MOODLE_INTERNAL') || die();

class get_learning_analytics extends external_api {

    public static function execute_parameters() {
        return new external_function_parameters([
            'date' => new external_value(PARAM_ALPHANUMEXT, 'Date in YYYY-MM-DD format')
        ]);
    }

    public static function execute($date) {
        global $DB;

        $params = self::validate_parameters(self::execute_parameters(), ['date' => $date]);
        
        $context = context_system::instance();
        self::validate_context($context);
        require_capability('local/temanbelajar:readanalytics', $context);

        // Calculate timestamps assuming Asia/Jakarta timezone or server default
        $dt = new \DateTime($params['date'], new \DateTimeZone('Asia/Jakarta'));
        $start_time = $dt->getTimestamp();
        $dt->modify('+1 day');
        $end_time = $dt->getTimestamp();

        // 1. Active Learners (users with meaningful course activity)
        $sql_active = "SELECT COUNT(DISTINCT userid) 
                       FROM {logstore_standard_log} 
                       WHERE timecreated >= ? AND timecreated < ? 
                         AND (eventname = '\\core\\event\\course_viewed' OR eventname = '\\core\\event\\course_module_viewed')";
        $active_learners = $DB->count_records_sql($sql_active, [$start_time, $end_time]);

        // 2. Eligible Starts & Completions
        $starts = $DB->count_records_select('course_completions', 'timestarted >= ? AND timestarted < ?', [$start_time, $end_time]);
        $completions = $DB->count_records_select('course_completions', 'timecompleted >= ? AND timecompleted < ?', [$start_time, $end_time]);

        $completion_rate = 0.0;
        if ($starts > 0) {
            $completion_rate = round(($completions / $starts) * 100, 2);
        }

        // 3. Course Utilization
        $sql_courses = "SELECT courseid, COUNT(DISTINCT userid) as unique_learners, COUNT(id) as accesses
                        FROM {logstore_standard_log}
                        WHERE timecreated >= ? AND timecreated < ?
                          AND eventname = '\\core\\event\\course_viewed'
                        GROUP BY courseid
                        ORDER BY accesses DESC
                        LIMIT 50";
        $rs = $DB->get_recordset_sql($sql_courses, [$start_time, $end_time]);
        
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
            'active_learners' => $active_learners,
            'learning_starts' => $starts,
            'completions' => $completions,
            'completion_rate' => $completion_rate,
            'top_courses' => $top_courses
        ];
    }

    public static function execute_returns() {
        return new external_single_structure([
            'active_learners' => new external_value(PARAM_INT, 'Number of active learners'),
            'learning_starts' => new external_value(PARAM_INT, 'Number of course starts'),
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
