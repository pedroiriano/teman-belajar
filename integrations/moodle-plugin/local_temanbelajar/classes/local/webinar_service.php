<?php

namespace local_temanbelajar\local;

use context_course;
use context_module;
use core_course_list_element;
use invalid_parameter_exception;
use local_temanbelajar\external\resolve_federated_user;

defined('MOODLE_INTERNAL') || die();

final class webinar_service {
    private const TIMEZONE = 'Asia/Jakarta';

    public static function resolve_user_id(string $subject): int {
        $user = resolve_federated_user::execute($subject);
        return (int) $user['id'];
    }

    public static function list(string $subject, int $page, int $pagesize): array {
        global $DB;

        $userid = self::resolve_user_id($subject);
        $cutoff = time() - (365 * DAYSECS);
        $records = $DB->get_records_select('zoom', 'webinar = ? AND (start_time + duration) >= ?', [1, $cutoff], 'start_time ASC, id ASC');
        $items = [];
        foreach ($records as $zoom) {
            $cm = get_coursemodule_from_instance('zoom', $zoom->id, $zoom->course, false, IGNORE_MISSING);
            if (!$cm || !self::can_view($cm, $userid)) {
                continue;
            }
            $items[] = self::session($cm, $zoom, $userid);
        }
        $total = count($items);
        $offset = ($page - 1) * $pagesize;
        return [
            'items' => array_slice($items, $offset, $pagesize),
            'page' => $page,
            'page_size' => $pagesize,
            'total' => $total,
            'total_pages' => $total === 0 ? 0 : (int) ceil($total / $pagesize),
            'synced_at' => gmdate('c'),
        ];
    }

    public static function get(string $subject, int $cmid): array {
        global $DB;

        $userid = self::resolve_user_id($subject);
        [$cm, $zoom] = self::resolve_webinar($cmid);
        if (!self::can_view($cm, $userid)) {
            throw new \required_capability_exception(context_module::instance($cmid), 'mod/zoom:view', 'nopermissions', '');
        }
        return self::session($cm, $zoom, $userid);
    }

    public static function register(string $subject, int $cmid, string $idempotencykey): array {
        return self::register_for_user(self::resolve_user_id($subject), $cmid, $idempotencykey);
    }

    /** @internal Exposed for Moodle integration tests; external callers use register(). */
    public static function register_for_user(int $userid, int $cmid, string $idempotencykey): array {
        global $DB;

        self::validate_idempotency_key($idempotencykey);
        [$cm, $zoom] = self::resolve_webinar($cmid);
        if (!self::can_view($cm, $userid)) {
            throw new \required_capability_exception(context_module::instance($cmid), 'mod/zoom:view', 'nopermissions', '');
        }
        if ((int) $zoom->start_time <= time() || empty($zoom->exists_on_zoom)) {
            throw new invalid_parameter_exception('Webinar registration is closed');
        }
        $capacity = self::configured_capacity();
        if ($capacity < 1) {
            throw new invalid_parameter_exception('Webinar capacity is not configured');
        }

        $transaction = $DB->start_delegated_transaction();
        $DB->get_record_sql('SELECT id FROM {course_modules} WHERE id = ? FOR UPDATE', [$cmid], MUST_EXIST);
        if (self::operation_already_applied($cmid, $userid, 'register', $idempotencykey)) {
            $transaction->allow_commit();
            return self::session($cm, $zoom, $userid);
        }
        $existing = $DB->get_record('local_tb_webinar_reg', ['cmid' => $cmid, 'userid' => $userid]);
        if (!$existing || $existing->status !== 'registered') {
            $registered = $DB->count_records('local_tb_webinar_reg', ['cmid' => $cmid, 'status' => 'registered']);
            if ($registered >= $capacity) {
                throw new invalid_parameter_exception('Webinar capacity is full; waitlist is disabled');
            }
            $now = time();
            if ($existing) {
                $existing->status = 'registered';
                $existing->idempotencykey = $idempotencykey;
                $existing->timemodified = $now;
                $DB->update_record('local_tb_webinar_reg', $existing);
            } else {
                $DB->insert_record('local_tb_webinar_reg', (object) [
                    'cmid' => $cmid,
                    'userid' => $userid,
                    'status' => 'registered',
                    'idempotencykey' => $idempotencykey,
                    'timecreated' => $now,
                    'timemodified' => $now,
                ]);
            }
        }
        self::record_capacity_policy($cmid, $capacity);
        self::record_operation($cmid, $userid, 'register', $idempotencykey);
        $transaction->allow_commit();
        return self::session($cm, $zoom, $userid);
    }

    public static function cancel(string $subject, int $cmid, string $idempotencykey): array {
        return self::cancel_for_user(self::resolve_user_id($subject), $cmid, $idempotencykey);
    }

    /** @internal Exposed for Moodle integration tests; external callers use cancel(). */
    public static function cancel_for_user(int $userid, int $cmid, string $idempotencykey): array {
        global $DB;

        self::validate_idempotency_key($idempotencykey);
        [$cm, $zoom] = self::resolve_webinar($cmid);
        if (!self::can_view($cm, $userid)) {
            throw new \required_capability_exception(context_module::instance($cmid), 'mod/zoom:view', 'nopermissions', '');
        }
        if ((int) $zoom->start_time <= time()) {
            throw new invalid_parameter_exception('Cancellation is not allowed after the webinar starts');
        }

        $transaction = $DB->start_delegated_transaction();
        $DB->get_record_sql('SELECT id FROM {course_modules} WHERE id = ? FOR UPDATE', [$cmid], MUST_EXIST);
        if (self::operation_already_applied($cmid, $userid, 'cancel', $idempotencykey)) {
            $transaction->allow_commit();
            return self::session($cm, $zoom, $userid);
        }
        $existing = $DB->get_record('local_tb_webinar_reg', ['cmid' => $cmid, 'userid' => $userid]);
        if ($existing && $existing->status !== 'cancelled') {
            $existing->status = 'cancelled';
            $existing->idempotencykey = $idempotencykey;
            $existing->timemodified = time();
            $DB->update_record('local_tb_webinar_reg', $existing);
        }
        self::record_operation($cmid, $userid, 'cancel', $idempotencykey);
        $transaction->allow_commit();
        return self::session($cm, $zoom, $userid);
    }

    private static function can_view(\stdClass $cm, int $userid): bool {
        $coursecontext = context_course::instance($cm->course);
        if (!is_enrolled($coursecontext, $userid, '', true)) {
            return false;
        }
        $modinfo = get_fast_modinfo($cm->course, $userid);
        $info = $modinfo->get_cm($cm->id);
        return $info->uservisible && has_capability('mod/zoom:view', context_module::instance($cm->id), $userid);
    }

    private static function resolve_webinar(int $cmid): array {
        global $DB;

        $cm = get_coursemodule_from_id('zoom', $cmid, 0, false, IGNORE_MISSING);
        if (!$cm) {
            throw new invalid_parameter_exception('Webinar not found');
        }
        $zoom = $DB->get_record('zoom', ['id' => $cm->instance, 'webinar' => 1]);
        if (!$zoom) {
            throw new invalid_parameter_exception('Webinar not found');
        }
        return [$cm, $zoom];
    }

    private static function configured_capacity(): int {
        return max(0, (int) get_config('local_temanbelajar', 'webinarcapacity'));
    }

    private static function validate_idempotency_key(string $value): void {
        if (!preg_match('/^[A-Za-z0-9._:-]{8,64}$/D', $value)) {
            throw new invalid_parameter_exception('Invalid idempotency key');
        }
    }

    private static function operation_already_applied(int $cmid, int $userid, string $operation, string $key): bool {
        global $DB;

        $existing = $DB->get_record('local_tb_webinar_ops', ['idempotencykey' => $key]);
        if (!$existing) {
            return false;
        }
        if ((int) $existing->cmid !== $cmid || (int) $existing->userid !== $userid || $existing->operation !== $operation) {
            throw new invalid_parameter_exception('Idempotency key is already used by another operation');
        }
        return true;
    }

    private static function record_operation(int $cmid, int $userid, string $operation, string $key): void {
        global $DB;

        $DB->insert_record('local_tb_webinar_ops', (object) [
            'cmid' => $cmid,
            'userid' => $userid,
            'operation' => $operation,
            'idempotencykey' => $key,
            'timecreated' => time(),
        ]);
    }

    private static function record_capacity_policy(int $cmid, int $capacity): void {
        global $DB;

        $now = time();
        $policy = $DB->get_record('local_tb_webinar_policy', ['cmid' => $cmid]);
        if ($policy) {
            if ((int) $policy->capacity !== $capacity) {
                $policy->capacity = $capacity;
                $policy->timemodified = $now;
                $DB->update_record('local_tb_webinar_policy', $policy);
            }
            return;
        }
        $DB->insert_record('local_tb_webinar_policy', (object) [
            'cmid' => $cmid,
            'capacity' => $capacity,
            'timecreated' => $now,
            'timemodified' => $now,
        ]);
    }

    private static function session(\stdClass $cm, \stdClass $zoom, int $userid): array {
        global $DB;

        $capacity = self::configured_capacity();
        $registeredcount = $DB->count_records('local_tb_webinar_reg', ['cmid' => $cm->id, 'status' => 'registered']);
        $registration = $DB->get_record('local_tb_webinar_reg', ['cmid' => $cm->id, 'userid' => $userid]);
        $registered = $registration && $registration->status === 'registered';
        $start = (int) $zoom->start_time;
        $end = $start + max(0, (int) $zoom->duration);
        $now = time();
        $status = empty($zoom->exists_on_zoom) ? 'cancelled' : ($now >= $end ? 'completed' : ($now >= $start ? 'live' : 'scheduled'));
        $registrationstate = $capacity < 1 ? 'configuration_required' : ($registered ? 'registered' : ($registeredcount >= $capacity ? 'full' : 'open'));

        $attendance = $DB->get_record_sql(
            'SELECT COALESCE(SUM(p.duration), 0) AS duration FROM {zoom_meeting_participants} p JOIN {zoom_meeting_details} d ON d.id = p.detailsid WHERE d.zoomid = ? AND p.userid = ?',
            [$zoom->id, $userid]
        );
        $hasrecording = (bool) get_config('zoom', 'viewrecordings') && $DB->record_exists('zoom_meeting_recordings', [
            'zoomid' => $zoom->id,
            'showrecording' => 1,
        ]);

        $course = get_course($cm->course);
        $contacts = (new core_course_list_element($course))->get_course_contacts();
        $speakers = array_slice(array_values(array_map(static fn(array $contact): string => $contact['username'], $contacts)), 0, 3);

        return [
            'id' => (int) $cm->id,
            'course_id' => (int) $cm->course,
            'title' => format_string($zoom->name, true, ['context' => context_module::instance($cm->id)]),
            'summary' => shorten_text(content_to_text((string) $zoom->intro, (int) $zoom->introformat), 500),
            'starts_at' => gmdate('c', $start),
            'ends_at' => gmdate('c', $end),
            'timezone' => self::TIMEZONE,
            'speakers' => $speakers,
            'capacity' => $capacity,
            'registered_count' => $registeredcount,
            'registration_state' => $registrationstate,
            'status' => $status,
            'registered' => (bool) $registered,
            'cancellation_allowed' => $registered && $now < $start,
            'join_path' => $registered ? '/mod/zoom/view.php?id=' . $cm->id : '',
            'recording_path' => $hasrecording ? '/mod/zoom/recordings.php?id=' . $cm->id : '',
            'attendance_seconds' => (int) ($attendance->duration ?? 0),
            'attendance_state' => $status === 'completed' ? 'synced' : 'pending',
            'source' => 'moodle_mod_zoom',
            'synced_at' => gmdate('c'),
        ];
    }
}
