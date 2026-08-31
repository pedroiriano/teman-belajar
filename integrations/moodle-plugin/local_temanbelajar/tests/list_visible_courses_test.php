<?php

namespace local_temanbelajar;

use core_external\external_api;
use local_temanbelajar\external\list_visible_courses;

/**
 * Regression coverage for the least-privilege course catalogue.
 *
 * @package local_temanbelajar
 * @covers \local_temanbelajar\external\list_visible_courses
 */
final class list_visible_courses_test extends \advanced_testcase {
    public function test_hidden_and_invalid_context_courses_do_not_break_catalogue(): void {
        $this->resetAfterTest();
        $user = $this->getDataGenerator()->create_user();
        $this->setUser($user);

        $visiblecategory = $this->getDataGenerator()->create_category(['visible' => 1]);
        $hiddencategory = $this->getDataGenerator()->create_category(['visible' => 0]);
        $visible = $this->getDataGenerator()->create_course([
            'category' => $visiblecategory->id,
            'shortname' => 'TASK013-VISIBLE',
            'fullname' => 'TASK-013 Visible Course',
            'visible' => 1,
        ]);
        $this->getDataGenerator()->create_course([
            'category' => $visiblecategory->id,
            'shortname' => 'TASK013-HIDDEN',
            'visible' => 0,
        ]);
        $this->getDataGenerator()->create_course([
            'category' => $hiddencategory->id,
            'shortname' => 'TASK013-HIDDEN-CATEGORY',
            'visible' => 1,
        ]);
        $invalidcontext = $this->getDataGenerator()->create_course([
            'category' => $visiblecategory->id,
            'shortname' => 'TASK013-NO-CONTEXT',
            'visible' => 1,
        ]);
        \context_course::instance($invalidcontext->id)->delete();

        $result = external_api::clean_returnvalue(
            list_visible_courses::execute_returns(),
            list_visible_courses::execute()
        );

        $this->assertCount(1, $result);
        $this->assertSame((int) $visible->id, $result[0]['id']);
        $this->assertSame('TASK013-VISIBLE', $result[0]['shortname']);
        $this->assertSame(1, $result[0]['visible']);
    }
}
