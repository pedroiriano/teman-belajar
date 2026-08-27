<?php

namespace local_temanbelajar;

/**
 * TASK-015 attendance retention regression tests.
 *
 * @package local_temanbelajar
 * @covers \local_temanbelajar\task\purge_webinar_attendance
 */
final class purge_webinar_attendance_test extends \advanced_testcase {
    public function test_only_participants_older_than_365_days_are_purged(): void {
        global $DB;

        $this->resetAfterTest();
        $course = $this->getDataGenerator()->create_course();
        $zoomid = $DB->insert_record('zoom', (object) [
            'course' => $course->id,
            'meeting_id' => 10000000001,
            'host_id' => 'host-test',
            'name' => 'Retention test',
            'webinar' => 1,
            'duration' => 3600,
            'timezone' => 'Asia/Jakarta',
            'exists_on_zoom' => 1,
            'recordings_visible_default' => 0,
            'show_schedule' => 1,
            'show_security' => 1,
            'show_media' => 1,
            'registration' => 2,
        ]);
        $oldid = $this->detail($zoomid, time() - (366 * DAYSECS), 'old-retention-fixture');
        $recentid = $this->detail($zoomid, time() - (364 * DAYSECS), 'recent-retention-fixture');
        $unknownendid = $this->detail($zoomid, 0, 'unknown-end-retention-fixture');
        $this->participant($oldid, 'old-user');
        $this->participant($recentid, 'recent-user');
        $this->participant($unknownendid, 'unknown-end-user');

        (new \local_temanbelajar\task\purge_webinar_attendance())->execute();

        $this->assertFalse($DB->record_exists('zoom_meeting_participants', ['detailsid' => $oldid]));
        $this->assertTrue($DB->record_exists('zoom_meeting_participants', ['detailsid' => $recentid]));
        $this->assertTrue($DB->record_exists('zoom_meeting_participants', ['detailsid' => $unknownendid]));
    }

    private function detail(int $zoomid, int $endtime, string $uuid): int {
        global $DB;
        return $DB->insert_record('zoom_meeting_details', (object) [
            'uuid' => $uuid,
            'meeting_id' => 10000000001,
            'end_time' => $endtime,
            'start_time' => $endtime - 3600,
            'duration' => 3600,
            'topic' => 'Retention test',
            'zoomid' => $zoomid,
        ]);
    }

    private function participant(int $detailsid, string $zoomuserid): void {
        global $DB;
        $DB->insert_record('zoom_meeting_participants', (object) [
            'zoomuserid' => $zoomuserid,
            'join_time' => time() - 300,
            'leave_time' => time(),
            'duration' => 300,
            'name' => 'Retention Learner',
            'detailsid' => $detailsid,
        ]);
    }
}
