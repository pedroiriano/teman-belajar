package moodle

import (
	"context"
	"fmt"
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
		if crs.ID == 1 {
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
	if identity.Subject == "" && identity.Email == "" {
		return nil, learning.ErrLearningUserNotMapped
	}

	params := url.Values{}
	// First try resolving by username (Keycloak sub might map to username in Moodle auth_oauth2/oidc)
	// Alternatively, try resolving by email if username fails.
	field := "username"
	value := identity.Subject // Often, sub is mapped to username when auto-provisioned
	if identity.Subject == "" {
		field = "email"
		value = identity.Email
	}

	params.Set("field", field)
	params.Set("values[0]", value)

	var response []struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	}

	err := c.callWS(ctx, "core_user_get_users_by_field", params, &response)
	if err != nil {
		return nil, err
	}

	if len(response) == 0 {
		// Fallback to email if we searched by username and failed
		if field == "username" && identity.Email != "" {
			params.Set("field", "email")
			params.Set("values[0]", identity.Email)
			err = c.callWS(ctx, "core_user_get_users_by_field", params, &response)
			if err != nil {
				return nil, err
			}
		}
	}

	if len(response) == 0 {
		return nil, learning.ErrLearningUserNotMapped
	}

	if len(response) > 1 {
		// Ambiguous mapping -> Fail Closed
		return nil, fmt.Errorf("%w: ambiguous identity resolution", learning.ErrLearningUserNotMapped)
	}

	user := response[0]
	return &learning.LearningUser{
		ID:       user.ID,
		Username: user.Username,
		Email:    user.Email,
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
		EnrolledAt int64   `json:"timeaccess"` // timeaccess used as last access, timeenrolled is not always available in this endpoint output
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
		if crs.EnrolledAt > 0 { // Moodle returns timeaccess which we'll use if available
			lastAccess = &crs.EnrolledAt
		}
		
		courses = append(courses, learning.EnrolledCourse{
			ID:         crs.ID,
			ShortName:  crs.ShortName,
			FullName:   crs.FullName,
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
		// Moodle might return an exception if completion is disabled for the course.
		// We normalize this.
		if strings.Contains(err.Error(), "completion") {
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
