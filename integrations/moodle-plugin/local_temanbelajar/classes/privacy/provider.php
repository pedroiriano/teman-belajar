<?php
/**
 * Privacy provider for local_temanbelajar.
 *
 * @package    local_temanbelajar
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

namespace local_temanbelajar\privacy;

defined('MOODLE_INTERNAL') || die();

/**
 * Privacy provider class.
 *
 * @copyright  2026 Teman Belajar
 * @license    http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */
class provider implements
        \core_privacy\local\metadata\provider,
        \core_privacy\local\request\plugin\provider {

    /**
     * Get the language string identifier to explain why this plugin stores no data.
     *
     * @return  string
     */
    public static function get_metadata(\core_privacy\local\metadata\collection $collection): \core_privacy\local\metadata\collection {
        $collection->add_database_table('local_tb_webinar_reg', [
            'cmid' => 'privacy:metadata:registration:cmid',
            'userid' => 'privacy:metadata:registration:userid',
            'status' => 'privacy:metadata:registration:status',
            'idempotencykey' => 'privacy:metadata:registration:idempotencykey',
            'timemodified' => 'privacy:metadata:registration:timemodified',
        ], 'privacy:metadata:registration');
        $collection->add_database_table('local_tb_webinar_ops', [
            'cmid' => 'privacy:metadata:registration:cmid',
            'userid' => 'privacy:metadata:registration:userid',
            'operation' => 'privacy:metadata:operation:type',
            'idempotencykey' => 'privacy:metadata:registration:idempotencykey',
            'timecreated' => 'privacy:metadata:operation:timecreated',
        ], 'privacy:metadata:operation');
        return $collection;
    }

    public static function get_contexts_for_userid(int $userid): \core_privacy\local\request\contextlist {
        $sql = 'SELECT ctx.id FROM {context} ctx JOIN {local_tb_webinar_reg} r ON r.cmid = ctx.instanceid WHERE ctx.contextlevel = :level AND r.userid = :userid';
        $params = ['level' => CONTEXT_MODULE, 'userid' => $userid];
        $contextlist = new \core_privacy\local\request\contextlist();
        $contextlist->add_from_sql($sql, $params);
        $contextlist->add_from_sql(
            'SELECT ctx.id FROM {context} ctx JOIN {local_tb_webinar_ops} o ON o.cmid = ctx.instanceid WHERE ctx.contextlevel = :level AND o.userid = :userid',
            $params
        );
        return $contextlist;
    }

    public static function export_user_data(\core_privacy\local\request\approved_contextlist $contextlist): void {
        global $DB;
        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel !== CONTEXT_MODULE) {
                continue;
            }
            $record = $DB->get_record('local_tb_webinar_reg', [
                'cmid' => $context->instanceid,
                'userid' => $contextlist->get_user()->id,
            ]);
            if ($record) {
                \core_privacy\local\request\writer::with_context($context)->export_data([
                    get_string('pluginname', 'local_temanbelajar'),
                    'webinar',
                ], (object) [
                    'status' => $record->status,
                    'timemodified' => \core_privacy\local\request\transform::datetime($record->timemodified),
                ]);
            }
            $operations = $DB->get_records('local_tb_webinar_ops', [
                'cmid' => $context->instanceid,
                'userid' => $contextlist->get_user()->id,
            ], 'timecreated ASC', 'id,operation,timecreated');
            if ($operations) {
                $export = array_values(array_map(static fn(\stdClass $operation): array => [
                    'operation' => $operation->operation,
                    'timecreated' => \core_privacy\local\request\transform::datetime($operation->timecreated),
                ], $operations));
                \core_privacy\local\request\writer::with_context($context)->export_data([
                    get_string('pluginname', 'local_temanbelajar'),
                    'webinar operations',
                ], (object) ['operations' => $export]);
            }
        }
    }

    public static function delete_data_for_all_users_in_context(\context $context): void {
        global $DB;
        if ($context->contextlevel === CONTEXT_MODULE) {
            $DB->delete_records('local_tb_webinar_ops', ['cmid' => $context->instanceid]);
            $DB->delete_records('local_tb_webinar_reg', ['cmid' => $context->instanceid]);
        }
    }

    public static function delete_data_for_user(\core_privacy\local\request\approved_contextlist $contextlist): void {
        global $DB;
        foreach ($contextlist->get_contexts() as $context) {
            if ($context->contextlevel === CONTEXT_MODULE) {
                $DB->delete_records('local_tb_webinar_ops', [
                    'cmid' => $context->instanceid,
                    'userid' => $contextlist->get_user()->id,
                ]);
                $DB->delete_records('local_tb_webinar_reg', [
                    'cmid' => $context->instanceid,
                    'userid' => $contextlist->get_user()->id,
                ]);
            }
        }
    }
}
