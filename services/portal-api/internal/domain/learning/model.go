package learning

import (
	"context"
	"errors"
)

var (
	ErrMoodleUnavailable     = errors.New("moodle is currently unavailable")
	ErrMoodleTimeout         = errors.New("moodle request timed out")
	ErrMoodleAuthentication  = errors.New("moodle authentication failed")
	ErrMoodlePermission      = errors.New("moodle permission denied")
	ErrMoodleFunction        = errors.New("moodle function unavailable")
	ErrMoodleInvalidResponse = errors.New("moodle returned invalid response")
	ErrLearningUserNotMapped = errors.New("learning user identity not mapped")
	ErrCourseNotFound        = errors.New("course not found")
)

// FederatedIdentity represents the authenticated user from Keycloak
type FederatedIdentity struct {
	Subject  string // The Keycloak `sub` claim
	Username string // The Keycloak `preferred_username` claim
	Email    string
	Name     string // The Keycloak `name` claim
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
	ID         int      `json:"id"`
	ShortName  string   `json:"short_name"`
	FullName   string   `json:"full_name"`
	EnrolledAt *int64   `json:"enrolled_at,omitempty"`
	LastAccess *int64   `json:"last_access,omitempty"`
	Progress   *float64 `json:"progress,omitempty"`
	Completed  bool     `json:"completed"`
}

// CourseCompletion represents completion status
type CourseCompletion struct {
	CourseID  int    `json:"course_id"`
	Completed bool   `json:"completed"`
	Status    string `json:"status"` // e.g. "completed", "incomplete", "unavailable"
}

// GradeItem represents a user's grade in a course
type GradeItem struct {
	ID             int      `json:"id"`
	ItemName       string   `json:"item_name"`
	Grade          *float64 `json:"grade,omitempty"`
	GradeMin       float64  `json:"grade_min"`
	GradeMax       float64  `json:"grade_max"`
	GradeFormatted string   `json:"grade_formatted"`
	Feedback       string   `json:"feedback"`
	Hidden         bool     `json:"hidden"`
}

// UserCertificate represents an issued certificate from mod_customcert
type UserCertificate struct {
	ID              int64  `json:"id"`
	CustomCertID    int64  `json:"customcert_id"`
	CourseID        int    `json:"course_id"`
	CourseName      string `json:"course_name"`
	CourseShortName string `json:"course_shortname"`
	CertificateName string `json:"certificate_name"`
	Code            string `json:"code"`
	TimeCreated     int64  `json:"timecreated"`
	DownloadURL     string `json:"download_url"`
	VerifyURL       string `json:"verify_url"`
}

// VerifiedCertificate represents verified public certificate details
type VerifiedCertificate struct {
	Code            string `json:"code"`
	RecipientName   string `json:"recipient_name"`
	CourseName      string `json:"course_name"`
	CertificateName string `json:"certificate_name"`
	IssuedAt        int64  `json:"issued_at"`
	Issuer          string `json:"issuer"`
	VerificationURL string `json:"verification_url"`
}

// CertificateVerificationResult represents the result of certificate verification
type CertificateVerificationResult struct {
	Valid       bool                 `json:"valid"`
	Certificate *VerifiedCertificate `json:"certificate,omitempty"`
	Message     string               `json:"message,omitempty"`
}

// TranscriptSummary represents cumulative metrics for a learner's transcript
type TranscriptSummary struct {
	TotalCourses       int     `json:"total_courses"`
	CompletedCourses   int     `json:"completed_courses"`
	InProgressCourses  int     `json:"in_progress_courses"`
	TotalLearningHours float64 `json:"total_learning_hours"`
	AverageScore       float64 `json:"average_score"`
	TotalCertificates  int     `json:"total_certificates"`
}

// TranscriptCourseItem represents an evaluated course record in a learner's transcript
type TranscriptCourseItem struct {
	CourseID        int     `json:"course_id"`
	CourseName      string  `json:"course_name"`
	ShortName       string  `json:"short_name"`
	Category        string  `json:"category"`
	Completed       bool    `json:"completed"`
	Progress        float64 `json:"progress"`
	FinalGrade      string  `json:"final_grade"`
	CertificateCode string  `json:"certificate_code,omitempty"`
	VerificationURL string  `json:"verification_url,omitempty"`
	CompletedAt     *int64  `json:"completed_at,omitempty"`
}

// TranscriptLearnerInfo represents user identity on the official transcript
type TranscriptLearnerInfo struct {
	Name     string `json:"name"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

// LearnerTranscript represents the official aggregated transcript and competency record
type LearnerTranscript struct {
	DocumentNumber string                 `json:"document_number"`
	IssuedAt       int64                  `json:"issued_at"`
	Institution    string                 `json:"institution"`
	Learner        TranscriptLearnerInfo  `json:"learner"`
	Summary        TranscriptSummary      `json:"summary"`
	Courses        []TranscriptCourseItem `json:"courses"`
}

// LearningProvider defines the port for communicating with the LMS
type LearningProvider interface {
	ListCourses(ctx context.Context, filter CourseFilter) ([]LearningCourse, error)
	ResolveCurrentUser(ctx context.Context, identity FederatedIdentity) (*LearningUser, error)
	ListUserCourses(ctx context.Context, user *LearningUser) ([]EnrolledCourse, error)
	GetCourseCompletion(ctx context.Context, user *LearningUser, courseID int) (*CourseCompletion, error)
	GetCourseGrades(ctx context.Context, user *LearningUser, courseID int) ([]GradeItem, error)
	GetUserCertificates(ctx context.Context, user *LearningUser) ([]UserCertificate, error)
	VerifyCertificate(ctx context.Context, code string) (*CertificateVerificationResult, error)
}


