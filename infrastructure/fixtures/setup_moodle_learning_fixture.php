<?php
define('CLI_SCRIPT', true);
require(__DIR__ . '/config.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/enrol/locallib.php');

global $DB;

$admin_user = $DB->get_record('user', array('username' => 'admin@temanbelajar.local'));
if (!$admin_user) {
    echo "Admin user not found, creating dummy for testing...\n";
    $admin_user = create_user_record('admin@temanbelajar.local', 'password');
}

// Ensure the Keycloak linked login exists
$linked = $DB->get_record('auth_oauth2_linked_login', array('userid' => $admin_user->id, 'issuerid' => 2));
if (!$linked) {
    $record = new stdClass();
    $record->userid = $admin_user->id;
    $record->issuerid = 2; // Typically 2 for Keycloak in dev
    $record->username = 'admin@temanbelajar.local';
    $record->email = 'admin@temanbelajar.local';
    $record->timecreated = time();
    $record->timemodified = time();
    $record->usermodified = 1;
    $DB->insert_record('auth_oauth2_linked_login', $record);
    echo "Created OIDC linked login for admin\n";
}

// Create a category
$category = $DB->get_record('course_categories', array('name' => 'Test Fixtures'));
if (!$category) {
    $cat = new stdClass();
    $cat->name = 'Test Fixtures';
    $cat->parent = 0;
    $category = core_course_category::create($cat);
    echo "Created category Test Fixtures\n";
}

// Create visible course
$visible_course = $DB->get_record('course', array('shortname' => 'FIXTURE-VIS-1'));
if (!$visible_course) {
    $course = new stdClass();
    $course->category = $category->id;
    $course->shortname = 'FIXTURE-VIS-1';
    $course->fullname = 'Visible Course Fixture';
    $course->visible = 1;
    $course->enablecompletion = 1;
    $visible_course = create_course($course);
    echo "Created Visible Course Fixture\n";
}

// Create hidden course
$hidden_course = $DB->get_record('course', array('shortname' => 'FIXTURE-HID-1'));
if (!$hidden_course) {
    $course = new stdClass();
    $course->category = $category->id;
    $course->shortname = 'FIXTURE-HID-1';
    $course->fullname = 'Hidden Course Fixture';
    $course->visible = 0;
    $course->enablecompletion = 1;
    $hidden_course = create_course($course);
    echo "Created Hidden Course Fixture\n";
}

// Enrol admin_user in visible course
$enrol_plugin = enrol_get_plugin('manual');
$enrol_instances = enrol_get_instances($visible_course->id, true);
$manual_instance = null;
foreach ($enrol_instances as $instance) {
    if ($instance->enrol === 'manual') {
        $manual_instance = $instance;
        break;
    }
}
if (!$manual_instance) {
    $enrol_plugin->add_instance($visible_course);
    $enrol_instances = enrol_get_instances($visible_course->id, true);
    foreach ($enrol_instances as $instance) {
        if ($instance->enrol === 'manual') {
            $manual_instance = $instance;
            break;
        }
    }
}

if (!$DB->record_exists('user_enrolments', array('enrolid' => $manual_instance->id, 'userid' => $admin_user->id))) {
    $role = $DB->get_record('role', array('shortname' => 'student'));
    $enrol_plugin->enrol_user($manual_instance, $admin_user->id, $role->id);
    echo "Enrolled admin in Visible Course Fixture\n";
}

// Setup a dummy grade item
require_once($CFG->libdir.'/gradelib.php');
$grade_item = grade_item::fetch(array('courseid' => $visible_course->id, 'itemtype' => 'manual', 'itemname' => 'Final Exam'));
if (!$grade_item) {
    $grade_item = new grade_item(array(
        'courseid' => $visible_course->id,
        'itemtype' => 'manual',
        'itemname' => 'Final Exam',
        'grademin' => 0,
        'grademax' => 100
    ));
    $grade_item->insert();
    
    // Set grade for user
    $grade_grade = new grade_grade(array(
        'itemid' => $grade_item->id,
        'userid' => $admin_user->id,
        'rawgrade' => 85,
        'finalgrade' => 85,
        'rawgrademax' => 100,
        'rawgrademin' => 0
    ));
    $grade_grade->insert();
    
    echo "Created dummy grade item and set grade 85 for admin\n";
}

echo "Fixtures setup complete.\n";
