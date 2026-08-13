package moodle

import (
	"context"
	"net/url"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/learning"
)

// ListCourses calls core_course_get_courses
func (c *Client) ListCourses(ctx context.Context, filter learning.CourseFilter) ([]learning.LearningCourse, error) {
	// If public, we might just pass empty options.
	// We rely on Moodle capability `moodle/course:viewhiddencourses` to filter hidden courses.
	var response []struct {
		ID        int    `json:"id"`
		ShortName string `json:"shortname"`
		FullName  string `json:"fullname"`
		Summary   string `json:"summary"`
		Category  string `json:"categoryname"`
		StartDate int64  `json:"startdate"`
		EndDate   int64  `json:"enddate"`
		Visible   int    `json:"visible"`
	}

	err := c.callWS(ctx, "core_course_get_courses", nil, &response)
	if err != nil {
		return nil, err
	}

	var courses []learning.LearningCourse
	for _, crs := range response {
		// Site course (ID=1) is usually omitted from standard listing
		if crs.ID == 1 || crs.Visible == 0 {
			continue
		}
		var startAt, endAt *int64
		if crs.StartDate > 0 {
			startAt = &crs.StartDate
		}
		if crs.EndDate > 0 {
			endAt = &crs.EndDate
		}
		courses = append(courses, learning.LearningCourse{
			ID:        crs.ID,
			ShortName: crs.ShortName,
			FullName:  crs.FullName,
			Summary:   crs.Summary,
			Category:  crs.Category,
			StartAt:   startAt,
			EndAt:     endAt,
			Visible:   crs.Visible == 1,
		})
	}

	return courses, nil
}

// ResolveCurrentUser calls core_user_get_users_by_field to find user by Keycloak sub or email.
func (c *Client) ResolveCurrentUser(ctx context.Context, identity learning.FederatedIdentity) (*learning.LearningUser, error) {
	if identity.Subject == "" {
		return nil, learning.ErrLearningUserNotMapped
	}

	params := url.Values{}
	params.Set("subject", identity.Subject)

	var response struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	}

	err := c.callWS(ctx, "local_temanbelajar_resolve_federated_user", params, &response)
	if err != nil {
		// Moodle exception is thrown if not mapped, which our client parses into error
		return nil, learning.ErrLearningUserNotMapped
	}

	return &learning.LearningUser{
		ID:       response.ID,
		Username: response.Username,
		Email:    response.Email,
	}, nil
}

// ListUserCourses calls core_enrol_get_users_courses
func (c *Client) ListUserCourses(ctx context.Context, user *learning.LearningUser) ([]learning.EnrolledCourse, error) {
	params := url.Values{}
	params.Set("userid", strconv.Itoa(user.ID))

	var response []struct {
		ID         int     `json:"id"`
		ShortName  string  `json:"shortname"`
		FullName   string  `json:"fullname"`
		TimeAccess int64   `json:"timeaccess"` // timeaccess used as last access
		TimeEnrolled int64 `json:"timeenrolled,omitempty"`
		Progress   *float64 `json:"progress"`
		Completed  bool    `json:"completed"`
	}

	err := c.callWS(ctx, "core_enrol_get_users_courses", params, &response)
	if err != nil {
		return nil, err
	}

	var courses []learning.EnrolledCourse
	for _, crs := range response {
		var lastAccess *int64
		if crs.TimeAccess > 0 { // Moodle returns timeaccess which we'll use if available
			lastAccess = &crs.TimeAccess
		}
		var enrolledAt *int64
		if crs.TimeEnrolled > 0 {
			enrolledAt = &crs.TimeEnrolled
		}
		
		courses = append(courses, learning.EnrolledCourse{
			ID:         crs.ID,
			ShortName:  crs.ShortName,
			FullName:   crs.FullName,
			EnrolledAt: enrolledAt,
			LastAccess: lastAccess,
			Progress:   crs.Progress,
			Completed:  crs.Completed,
		})
	}

	return courses, nil
}

// GetCourseCompletion calls core_completion_get_course_completion_status
func (c *Client) GetCourseCompletion(ctx context.Context, user *learning.LearningUser, courseID int) (*learning.CourseCompletion, error) {
	params := url.Values{}
	params.Set("courseid", strconv.Itoa(courseID))
	params.Set("userid", strconv.Itoa(user.ID))

	var response struct {
		CompletionStatus struct {
			Completed bool `json:"completed"`
		} `json:"completionstatus"`
		Warnings []struct {
			Warningcode string `json:"warningcode"`
			Message     string `json:"message"`
		} `json:"warnings,omitempty"`
	}

	err := c.callWS(ctx, "core_completion_get_course_completion_status", params, &response)
	if err != nil {
		// Moodle returns exception if completion is disabled or not tracked.
		// It might be mapped to ErrMoodleCompletionDisabled in client.go
		if err == learning.ErrCourseNotFound || strings.Contains(err.Error(), "errorcoursecompletedisabled") {
			return &learning.CourseCompletion{
				CourseID:  courseID,
				Completed: false,
				Status:    "unavailable",
			}, nil
		}
		return nil, err
	}

	for _, w := range response.Warnings {
		if w.Warningcode == "cannotviewreport" {
			return nil, learning.ErrMoodlePermission
		}
	}

	status := "incomplete"
	if response.CompletionStatus.Completed {
		status = "completed"
	}

	return &learning.CourseCompletion{
		CourseID:  courseID,
		Completed: response.CompletionStatus.Completed,
		Status:    status,
	}, nil
}

// GetCourseGrades calls gradereport_user_get_grade_items
func (c *Client) GetCourseGrades(ctx context.Context, user *learning.LearningUser, courseID int) ([]learning.GradeItem, error) {
	params := url.Values{}
	params.Set("courseid", strconv.Itoa(courseID))
	params.Set("userid", strconv.Itoa(user.ID))

	var response struct {
		UserGrades []struct {
			GradeItems []struct {
				ID             int     `json:"id"`
				ItemName       string  `json:"itemname"`
				GradeFormatted string  `json:"gradeformatted"`
				GradeRaw       *float64 `json:"graderaw"`
				GradeMin       float64 `json:"grademin"`
				GradeMax       float64 `json:"grademax"`
				Feedback       string  `json:"feedback"`
				Hidden         bool    `json:"hidden"`
			} `json:"gradeitems"`
		} `json:"usergrades"`
		Warnings []struct {
			Message string `json:"message"`
		} `json:"warnings,omitempty"`
	}

	err := c.callWS(ctx, "gradereport_user_get_grade_items", params, &response)
	if err != nil {
		return nil, err
	}

	if len(response.UserGrades) == 0 {
		return []learning.GradeItem{}, nil
	}

	var items []learning.GradeItem
	for _, gi := range response.UserGrades[0].GradeItems {
		// Do not expose hidden grades.
		if gi.Hidden {
			continue
		}
		
		items = append(items, learning.GradeItem{
			ID:             gi.ID,
			ItemName:       gi.ItemName,
			Grade:          gi.GradeRaw,
			GradeMin:       gi.GradeMin,
			GradeMax:       gi.GradeMax,
			GradeFormatted: gi.GradeFormatted,
			Feedback:       gi.Feedback,
			Hidden:         gi.Hidden,
		})
	}

	return items, nil
}
