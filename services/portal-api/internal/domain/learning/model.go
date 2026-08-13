package learning

import (
	"context"
	"errors"
)

var (
	ErrMoodleUnavailable        = errors.New("moodle is currently unavailable")
	ErrMoodleTimeout            = errors.New("moodle request timed out")
	ErrMoodleAuthentication     = errors.New("moodle authentication failed")
	ErrMoodlePermission         = errors.New("moodle permission denied")
	ErrMoodleFunction           = errors.New("moodle function unavailable")
	ErrMoodleInvalidResponse    = errors.New("moodle returned invalid response")
	ErrLearningUserNotMapped    = errors.New("learning user identity not mapped")
	ErrCourseNotFound           = errors.New("course not found")
)

// FederatedIdentity represents the authenticated user from Keycloak
type FederatedIdentity struct {
	Subject string // The Keycloak `sub` claim
	Email   string
}

// LearningUser represents a resolved user in the LMS (Moodle)
type LearningUser struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// LearningCourse represents a course in the catalogue
type LearningCourse struct {
	ID        int    `json:"id"`
	ShortName string `json:"short_name"`
	FullName  string `json:"full_name"`
	Summary   string `json:"summary"`
	Category  string `json:"category"`
	StartAt   *int64 `json:"start_at,omitempty"`
	EndAt     *int64 `json:"end_at,omitempty"`
	Visible   bool   `json:"visible"`
}

type CourseFilter struct {
	// Add fields if needed for future filtering
}

// EnrolledCourse represents a course the user is enrolled in
type EnrolledCourse struct {
	ID              int     `json:"id"`
	ShortName       string  `json:"short_name"`
	FullName        string  `json:"full_name"`
	EnrolledAt      *int64  `json:"enrolled_at,omitempty"`
	LastAccess      *int64  `json:"last_access,omitempty"`
	Progress        *float64 `json:"progress,omitempty"`
	Completed       bool    `json:"completed"`
}

// CourseCompletion represents completion status
type CourseCompletion struct {
	CourseID  int    `json:"course_id"`
	Completed bool   `json:"completed"`
	Status    string `json:"status"` // e.g. "completed", "incomplete", "unavailable"
}

// GradeItem represents a user's grade in a course
type GradeItem struct {
	ID         int     `json:"id"`
	ItemName   string  `json:"item_name"`
	Grade      *float64 `json:"grade,omitempty"`
	GradeMin   float64 `json:"grade_min"`
	GradeMax   float64 `json:"grade_max"`
	GradeFormatted string `json:"grade_formatted"`
	Feedback   string  `json:"feedback"`
	Hidden     bool    `json:"hidden"`
}

// LearningProvider defines the port for communicating with the LMS
type LearningProvider interface {
	ListCourses(ctx context.Context, filter CourseFilter) ([]LearningCourse, error)
	ResolveCurrentUser(ctx context.Context, identity FederatedIdentity) (*LearningUser, error)
	ListUserCourses(ctx context.Context, user *LearningUser) ([]EnrolledCourse, error)
	GetCourseCompletion(ctx context.Context, user *LearningUser, courseID int) (*CourseCompletion, error)
	GetCourseGrades(ctx context.Context, user *LearningUser, courseID int) ([]GradeItem, error)
}
