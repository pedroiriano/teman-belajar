package training

import (
	"errors"
	"time"
)

type Status string

const (
	StatusDraft     Status = "draft"
	StatusInReview  Status = "in_review"
	StatusApproved  Status = "approved"
	StatusPublished Status = "published"
	StatusArchived  Status = "archived"
)

var (
	ErrValidation          = errors.New("training program validation failed")
	ErrNotFound            = errors.New("training program not found")
	ErrForbidden           = errors.New("training program operation forbidden")
	ErrConflict            = errors.New("training program version conflict")
	ErrInvalidTransition   = errors.New("invalid training program transition")
	ErrLearningUnavailable = errors.New("learning catalogue unavailable")
)

type CourseRef struct {
	MoodleCourseID int  `json:"moodle_course_id"`
	SortOrder      int  `json:"sort_order"`
	Required       bool `json:"required"`
}

type Cohort struct {
	ID                 string     `json:"id"`
	Label              string     `json:"label"`
	StartsAt           *time.Time `json:"starts_at,omitempty"`
	EndsAt             *time.Time `json:"ends_at,omitempty"`
	EnrollmentOpensAt  *time.Time `json:"enrollment_opens_at,omitempty"`
	EnrollmentClosesAt *time.Time `json:"enrollment_closes_at,omitempty"`
	Status             string     `json:"status"`
	SortOrder          int        `json:"sort_order"`
}

type Program struct {
	ID              string      `json:"id"`
	Slug            string      `json:"slug"`
	Title           string      `json:"title"`
	Summary         string      `json:"summary"`
	Description     string      `json:"description"`
	Audience        string      `json:"audience"`
	EligibilityText string      `json:"eligibility_text"`
	Status          Status      `json:"status"`
	Version         int64       `json:"version"`
	PublishedAt     *time.Time  `json:"published_at,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	UpdatedAt       time.Time   `json:"updated_at"`
	Courses         []CourseRef `json:"courses,omitempty"`
	Cohorts         []Cohort    `json:"cohorts,omitempty"`
}

type CourseInput struct {
	MoodleCourseID int  `json:"moodle_course_id"`
	Required       bool `json:"required"`
}

type CohortInput struct {
	Label              string     `json:"label"`
	StartsAt           *time.Time `json:"starts_at"`
	EndsAt             *time.Time `json:"ends_at"`
	EnrollmentOpensAt  *time.Time `json:"enrollment_opens_at"`
	EnrollmentClosesAt *time.Time `json:"enrollment_closes_at"`
	Status             string     `json:"status"`
}

type ProgramInput struct {
	Slug            string        `json:"slug"`
	Title           string        `json:"title"`
	Summary         string        `json:"summary"`
	Description     string        `json:"description"`
	Audience        string        `json:"audience"`
	EligibilityText string        `json:"eligibility_text"`
	Courses         []CourseInput `json:"courses"`
	Cohorts         []CohortInput `json:"cohorts"`
	ExpectedVersion int64         `json:"expected_version"`
}

type ListFilter struct {
	Query    string
	Status   string
	Page     int
	PageSize int
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type ProgramList struct {
	Data       []Program  `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type Provenance struct {
	Source    string    `json:"source"`
	CheckedAt time.Time `json:"checked_at"`
	State     string    `json:"state"`
	Detail    string    `json:"detail,omitempty"`
}

type ComposedCourse struct {
	MoodleCourseID int      `json:"moodle_course_id"`
	ShortName      string   `json:"short_name,omitempty"`
	FullName       string   `json:"full_name,omitempty"`
	Summary        string   `json:"summary,omitempty"`
	Category       string   `json:"category,omitempty"`
	Required       bool     `json:"required"`
	Availability   string   `json:"availability"`
	LearnerState   string   `json:"learner_state,omitempty"`
	Progress       *float64 `json:"progress,omitempty"`
	StartURL       string   `json:"start_url,omitempty"`
}

type ProgramDetail struct {
	Program    Program          `json:"program"`
	Courses    []ComposedCourse `json:"courses"`
	Provenance Provenance       `json:"provenance"`
}

type Eligibility struct {
	Status  string `json:"status"`
	Message string `json:"message"`
}

type CTA struct {
	Kind  string `json:"kind"`
	Label string `json:"label"`
	URL   string `json:"url,omitempty"`
}

type ProgramProgress struct {
	ProgramSlug      string           `json:"program_slug"`
	Courses          []ComposedCourse `json:"courses"`
	CompletedCourses int              `json:"completed_courses"`
	EnrolledCourses  int              `json:"enrolled_courses"`
	TotalCourses     int              `json:"total_courses"`
	ProgressPercent  *float64         `json:"progress_percent,omitempty"`
	Eligibility      Eligibility      `json:"eligibility"`
	CTA              CTA              `json:"cta"`
	Provenance       Provenance       `json:"provenance"`
}
