# TASK-005 Function Matrix

| Portal capability | Moodle authoritative source | Exact WS function | Read/Write | Required Moodle capability | External Service membership | Core API / local_temanbelajar | TASK-005 status |
|---|---|---|---|---|---|---|---|
| Course Catalogue | Courses | `core_course_get_courses` | Read | `moodle/course:viewhiddencourses` (for hidden) or none for visible | `teman-belajar-integration-service` | Core API | NOT IMPLEMENTED |
| My Courses | User Enrolments | `core_enrol_get_users_courses` | Read | `moodle/course:viewparticipants` | `teman-belajar-integration-service` | Core API | NOT IMPLEMENTED |
| Enrolments | Enrolment methods | `enrol_manual_enrol_users` | Write | `enrol/manual:enrol` | `teman-belajar-integration-service` | Core API | NOT IMPLEMENTED |
| Completion | Course Completion | `core_completion_get_course_completion_status` | Read | `report/completion:view` | `teman-belajar-integration-service` | Core API | NOT IMPLEMENTED |
| Grades / Results | Gradebook | `gradereport_user_get_grade_items` | Read | `gradereport/user:view` | `teman-belajar-integration-service` | Core API | NOT IMPLEMENTED |
| Moodle User Context | User | `core_user_get_users_by_field` | Read | `moodle/user:viewdetails` | `teman-belajar-integration-service` | Core API | NOT IMPLEMENTED |
