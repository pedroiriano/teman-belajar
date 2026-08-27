<?php

namespace local_temanbelajar\task;

defined('MOODLE_INTERNAL') || die();

final class purge_webinar_attendance extends \core\task\scheduled_task {
    public function get_name(): string {
        return get_string('purgewebinarattendance', 'local_temanbelajar');
    }

    public function execute(): void {
        global $DB;

        $manager = $DB->get_manager();
        if (!$manager->table_exists('zoom_meeting_details') || !$manager->table_exists('zoom_meeting_participants')) {
            mtrace('TASK-015 attendance retention skipped: mod_zoom schema unavailable.');
            return;
        }
        $cutoff = time() - (365 * DAYSECS);
        $detailids = $DB->get_fieldset_select('zoom_meeting_details', 'id', 'end_time > 0 AND end_time < ?', [$cutoff]);
        if ($detailids === []) {
            mtrace('TASK-015 attendance retention: 0 expired participant rows.');
            return;
        }
        [$insql, $params] = $DB->get_in_or_equal($detailids, SQL_PARAMS_QM);
        $count = $DB->count_records_select('zoom_meeting_participants', "detailsid $insql", $params);
        $DB->delete_records_select('zoom_meeting_participants', "detailsid $insql", $params);
        mtrace('TASK-015 attendance retention purged ' . $count . ' expired participant rows.');
    }
}
