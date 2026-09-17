package enrollment

import (
	"errors"
	"strings"
	"time"
)

type Status string

const (
	StatusPending   Status = "pending"
	StatusConfirmed Status = "confirmed"
	StatusRejected  Status = "rejected"
	StatusCancelled Status = "cancelled"
)

var (
	ErrNotFound         = errors.New("enrollment not found")
	ErrAlreadyApplied   = errors.New("learner has already applied for this training program")
	ErrProgramNotFound  = errors.New("training program not found")
	ErrCohortNotFound   = errors.New("cohort not found for this training program")
	ErrInvalidStatus    = errors.New("invalid enrollment status transition")
	ErrValidation       = errors.New("enrollment validation failed")
	ErrForbidden        = errors.New("operation forbidden")
	ErrUserResolution   = errors.New("failed to resolve user in Moodle")
	ErrMoodleEnrollment = errors.New("failed to enrol user into Moodle courses")
)

type Enrollment struct {
	ID              string     `json:"id"`
	UserSubject     string     `json:"user_subject"`
	UserName        string     `json:"user_name"`
	UserEmail       string     `json:"user_email"`
	ProgramSlug     string     `json:"program_slug"`
	ProgramTitle    string     `json:"program_title"`
	CohortID        *string    `json:"cohort_id,omitempty"`
	CohortLabel     string     `json:"cohort_label"`
	Status          Status     `json:"status"`
	Notes           string     `json:"notes,omitempty"`
	RejectionReason string     `json:"rejection_reason,omitempty"`
	AppliedAt       time.Time  `json:"applied_at"`
	ConfirmedAt     *time.Time `json:"confirmed_at,omitempty"`
	ConfirmedBy     string     `json:"confirmed_by,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ApplyInput struct {
	CohortID string `json:"cohort_id"`
	Notes    string `json:"notes,omitempty"`
}

func (in *ApplyInput) Validate() error {
	if strings.TrimSpace(in.CohortID) == "" {
		return errors.New("cohort_id is required")
	}
	if len(in.Notes) > 2000 {
		return errors.New("notes cannot exceed 2000 characters")
	}
	return nil
}

type RejectInput struct {
	Reason string `json:"reason"`
}

func (in *RejectInput) Validate() error {
	if strings.TrimSpace(in.Reason) == "" {
		return errors.New("rejection reason is required")
	}
	if len(in.Reason) > 1000 {
		return errors.New("rejection reason cannot exceed 1000 characters")
	}
	return nil
}

type ManualEnrollInput struct {
	UserSubject string  `json:"user_subject"`
	UserName    string  `json:"user_name"`
	UserEmail   string  `json:"user_email"`
	ProgramSlug string  `json:"program_slug"`
	CohortID    *string `json:"cohort_id,omitempty"`
	CohortLabel string  `json:"cohort_label"`
	Notes       string  `json:"notes,omitempty"`
}

func (in *ManualEnrollInput) Validate() error {
	if strings.TrimSpace(in.UserSubject) == "" && strings.TrimSpace(in.UserEmail) == "" {
		return errors.New("user_subject or user_email is required")
	}
	if strings.TrimSpace(in.ProgramSlug) == "" {
		return errors.New("program_slug is required")
	}
	return nil
}

type Filter struct {
	Query       string
	ProgramSlug string
	Status      string
	Page        int
	PageSize    int
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

type Metrics struct {
	TotalApplications int `json:"total_applications"`
	PendingCount      int `json:"pending_count"`
	ConfirmedCount    int `json:"confirmed_count"`
	RejectedCount     int `json:"rejected_count"`
}

type ListResponse struct {
	Data       []Enrollment `json:"data"`
	Pagination Pagination   `json:"pagination"`
	Metrics    Metrics      `json:"metrics"`
}

type UserEnrollmentStatus struct {
	HasApplication bool        `json:"has_application"`
	Enrollment     *Enrollment `json:"enrollment,omitempty"`
}
