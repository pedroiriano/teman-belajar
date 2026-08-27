<?php

defined('MOODLE_INTERNAL') || die();

if ($hassiteconfig) {
    $settings = new admin_settingpage('local_temanbelajar', get_string('pluginname', 'local_temanbelajar'));
    $ADMIN->add('localplugins', $settings);
    $settings->add(new admin_setting_configtext(
        'local_temanbelajar/webinarcapacity',
        get_string('webinarcapacity', 'local_temanbelajar'),
        get_string('webinarcapacity_help', 'local_temanbelajar'),
        0,
        PARAM_INT
    ));
}
