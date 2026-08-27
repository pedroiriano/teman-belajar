<?php

namespace local_temanbelajar\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_value;
use local_temanbelajar\local\webinar_service;

defined('MOODLE_INTERNAL') || die();

final class register_webinar extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'subject' => new external_value(PARAM_RAW_TRIMMED, 'Authenticated OIDC subject'),
            'course_module_id' => new external_value(PARAM_INT, 'Zoom course module ID'),
            'idempotency_key' => new external_value(PARAM_RAW_TRIMMED, 'Opaque retry-safe operation key'),
        ]);
    }

    public static function execute(string $subject, int $coursemoduleid, string $idempotencykey): array {
        $params = self::validate_parameters(self::execute_parameters(), [
            'subject' => $subject,
            'course_module_id' => $coursemoduleid,
            'idempotency_key' => $idempotencykey,
        ]);
        self::validate_context(context_system::instance());
        return webinar_service::register($params['subject'], $params['course_module_id'], $params['idempotency_key']);
    }

    public static function execute_returns() {
        return webinar_contract::session();
    }
}
