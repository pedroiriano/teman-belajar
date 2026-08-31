<?php

namespace local_temanbelajar\external;

use context_course;
use context_system;
use core_course_category;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

/**
 * Returns an allowlisted catalogue of learner-visible courses.
 *
 * @package local_temanbelajar
 */
final class list_visible_courses extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([]);
    }

    public static function execute(): array {
        global $CFG;

        require_once($CFG->dirroot . '/course/lib.php');
        self::validate_parameters(self::execute_parameters(), []);
        self::validate_context(context_system::instance());

        $result = [];
        foreach (get_courses() as $course) {
            if ((int) $course->id === SITEID || empty($course->visible)) {
                continue;
            }
            $category = core_course_category::get($course->category, IGNORE_MISSING, true);
            if (!$category || empty($category->visible)) {
                continue;
            }
            $context = context_course::instance($course->id, IGNORE_MISSING);
            if (!$context) {
                continue;
            }
            $result[] = [
                'id' => (int) $course->id,
                'shortname' => format_string($course->shortname, true, ['context' => $context]),
                'fullname' => format_string($course->fullname, true, ['context' => $context]),
                'summary' => trim(content_to_text($course->summary, $course->summaryformat)),
                'categoryname' => $category->get_formatted_name(),
                'startdate' => (int) $course->startdate,
                'enddate' => (int) $course->enddate,
                'visible' => 1,
            ];
        }
        return $result;
    }

    public static function execute_returns(): external_multiple_structure {
        return new external_multiple_structure(new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Moodle course ID'),
            'shortname' => new external_value(PARAM_TEXT, 'Course short name'),
            'fullname' => new external_value(PARAM_TEXT, 'Course full name'),
            'summary' => new external_value(PARAM_TEXT, 'Plain-text course summary'),
            'categoryname' => new external_value(PARAM_TEXT, 'Visible category name'),
            'startdate' => new external_value(PARAM_INT, 'Course start timestamp'),
            'enddate' => new external_value(PARAM_INT, 'Course end timestamp'),
            'visible' => new external_value(PARAM_INT, 'Always one for returned courses'),
        ]));
    }
}
