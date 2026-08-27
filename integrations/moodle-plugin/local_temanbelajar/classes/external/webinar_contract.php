<?php

namespace local_temanbelajar\external;

use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;

defined('MOODLE_INTERNAL') || die();

final class webinar_contract {
    public static function session(): external_single_structure {
        return new external_single_structure([
            'id' => new external_value(PARAM_INT, 'Moodle course module ID'),
            'course_id' => new external_value(PARAM_INT, 'Moodle course ID'),
            'title' => new external_value(PARAM_TEXT, 'Webinar title'),
            'summary' => new external_value(PARAM_TEXT, 'Sanitized webinar summary'),
            'starts_at' => new external_value(PARAM_RAW, 'UTC ISO-8601 start instant'),
            'ends_at' => new external_value(PARAM_RAW, 'UTC ISO-8601 end instant'),
            'timezone' => new external_value(PARAM_ALPHANUMEXT, 'Display IANA timezone'),
            'speakers' => new external_multiple_structure(new external_value(PARAM_TEXT, 'Moodle course contact')),
            'capacity' => new external_value(PARAM_INT, 'Confirmed tenant capacity; zero means unconfigured'),
            'registered_count' => new external_value(PARAM_INT, 'Active registrations'),
            'registration_state' => new external_value(PARAM_ALPHAEXT, 'open, full, registered, or configuration_required'),
            'status' => new external_value(PARAM_ALPHA, 'scheduled, live, completed, or cancelled'),
            'registered' => new external_value(PARAM_BOOL, 'Whether the resolved learner is registered'),
            'cancellation_allowed' => new external_value(PARAM_BOOL, 'Whether cancellation is still allowed'),
            'join_path' => new external_value(PARAM_LOCALURL, 'Sanitized internal Moodle route, never a Zoom URL'),
            'recording_path' => new external_value(PARAM_LOCALURL, 'Sanitized internal Moodle recording route'),
            'attendance_seconds' => new external_value(PARAM_INT, 'Retained learner attendance seconds'),
            'attendance_state' => new external_value(PARAM_ALPHA, 'pending or synced'),
            'source' => new external_value(PARAM_ALPHANUMEXT, 'Authoritative source'),
            'synced_at' => new external_value(PARAM_RAW, 'UTC ISO-8601 freshness instant'),
        ]);
    }
}
