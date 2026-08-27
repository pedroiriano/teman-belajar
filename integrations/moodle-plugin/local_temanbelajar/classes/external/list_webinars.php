<?php

namespace local_temanbelajar\external;

use context_system;
use core_external\external_api;
use core_external\external_function_parameters;
use core_external\external_multiple_structure;
use core_external\external_single_structure;
use core_external\external_value;
use local_temanbelajar\local\webinar_service;

defined('MOODLE_INTERNAL') || die();

final class list_webinars extends external_api {
    public static function execute_parameters(): external_function_parameters {
        return new external_function_parameters([
            'subject' => new external_value(PARAM_RAW_TRIMMED, 'Authenticated OIDC subject'),
            'page' => new external_value(PARAM_INT, 'One-based page', VALUE_DEFAULT, 1),
            'page_size' => new external_value(PARAM_INT, 'Items per page', VALUE_DEFAULT, 12),
        ]);
    }

    public static function execute(string $subject, int $page = 1, int $pagesize = 12): array {
        $params = self::validate_parameters(self::execute_parameters(), [
            'subject' => $subject,
            'page' => $page,
            'page_size' => $pagesize,
        ]);
        self::validate_context(context_system::instance());
        if ($params['page'] < 1 || $params['page_size'] < 1 || $params['page_size'] > 50) {
            throw new \invalid_parameter_exception('Invalid pagination');
        }
        return webinar_service::list($params['subject'], $params['page'], $params['page_size']);
    }

    public static function execute_returns(): external_single_structure {
        return new external_single_structure([
            'items' => new external_multiple_structure(webinar_contract::session()),
            'page' => new external_value(PARAM_INT, 'Current page'),
            'page_size' => new external_value(PARAM_INT, 'Page size'),
            'total' => new external_value(PARAM_INT, 'Total visible webinars'),
            'total_pages' => new external_value(PARAM_INT, 'Total pages'),
            'synced_at' => new external_value(PARAM_RAW, 'UTC ISO-8601 freshness instant'),
        ]);
    }
}
