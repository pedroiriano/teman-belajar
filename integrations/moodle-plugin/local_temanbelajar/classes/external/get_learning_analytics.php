<?php
namespace local_temanbelajar\external;

use external_api;
use external_function_parameters;
use external_value;
use external_single_structure;

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
        
        // Simple aggregate logic: active learners who logged in that day
        $start_time = strtotime($params['date']);
        $end_time = $start_time + 86400;

        $active_learners = $DB->count_records_select('user', 'lastaccess >= ? AND lastaccess < ?', [$start_time, $end_time]);
        
        $completions = $DB->count_records_select('course_completions', 'timecompleted >= ? AND timecompleted < ?', [$start_time, $end_time]);

        return [
            'active_learners' => $active_learners,
            'completions' => $completions
        ];
    }

    public static function execute_returns() {
        return new external_single_structure([
            'active_learners' => new external_value(PARAM_INT, 'Number of active learners'),
            'completions' => new external_value(PARAM_INT, 'Number of course completions')
        ]);
    }
}

