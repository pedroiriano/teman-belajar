<?php

namespace local_temanbelajar;

use local_temanbelajar\local\webinar_service;

/**
 * Integration coverage for the Moodle-authoritative registration projection.
 *
 * @package local_temanbelajar
 * @covers \local_temanbelajar\local\webinar_service
 */
final class webinar_service_test extends \advanced_testcase {
    private function fixture(int $capacity = 1): array {
        $course = $this->getDataGenerator()->create_course();
        $user = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($user->id, $course->id, 'student');
        $zoom = $this->getDataGenerator()->get_plugin_generator('mod_zoom')->create_instance([
            'course' => $course->id,
            'name' => 'TASK-015 Webinar',
            'webinar' => 1,
            'start_time' => time() + DAYSECS,
            'duration' => HOURSECS,
            'exists_on_zoom' => 1,
        ]);
        set_config('webinarcapacity', $capacity, 'local_temanbelajar');
        return [$course, $user, $zoom];
    }

    public function test_mutations_are_idempotent_across_later_state_changes(): void {
        global $DB;
        $this->resetAfterTest();
        [, $user, $zoom] = $this->fixture();

        webinar_service::register_for_user($user->id, $zoom->cmid, 'register:fixture:01');
        webinar_service::register_for_user($user->id, $zoom->cmid, 'register:fixture:01');
        $this->assertSame(1, $DB->count_records('local_tb_webinar_ops'));

        webinar_service::cancel_for_user($user->id, $zoom->cmid, 'cancel:fixture:0001');
        $replayed = webinar_service::register_for_user($user->id, $zoom->cmid, 'register:fixture:01');
        $this->assertFalse($replayed['registered']);
        $this->assertSame(2, $DB->count_records('local_tb_webinar_ops'));
    }

    public function test_capacity_fails_closed_without_waitlist(): void {
        $this->resetAfterTest();
        [$course, $first, $zoom] = $this->fixture(1);
        $second = $this->getDataGenerator()->create_user();
        $this->getDataGenerator()->enrol_user($second->id, $course->id, 'student');
        webinar_service::register_for_user($first->id, $zoom->cmid, 'register:first:001');

        $this->expectException(\invalid_parameter_exception::class);
        $this->expectExceptionMessage('waitlist is disabled');
        webinar_service::register_for_user($second->id, $zoom->cmid, 'register:second:01');
    }

    public function test_cancellation_closes_at_start_time(): void {
        global $DB;
        $this->resetAfterTest();
        [, $user, $zoom] = $this->fixture();
        webinar_service::register_for_user($user->id, $zoom->cmid, 'register:start:001');
        $DB->set_field('zoom', 'start_time', time() - 1, ['id' => $zoom->id]);

        $this->expectException(\invalid_parameter_exception::class);
        $this->expectExceptionMessage('after the webinar starts');
        webinar_service::cancel_for_user($user->id, $zoom->cmid, 'cancel:start:0001');
    }
}
