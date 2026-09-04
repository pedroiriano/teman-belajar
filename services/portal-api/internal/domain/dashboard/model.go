package dashboard

import "time"

// Summary is the top-level response returned by GET /api/v1/admin/dashboard/summary.
type Summary struct {
	KPI              KPI              `json:"kpi"`
	ContentBreakdown ContentBreakdown `json:"content_breakdown"`
	ReviewQueue      []ReviewItem     `json:"review_queue"`
	GeneratedAt      time.Time        `json:"generated_at"`
}

// KPI holds the four headline counters shown as Cuba KPI cards.
type KPI struct {
	TotalPublished int `json:"total_published"`
	TotalDraft     int `json:"total_draft"`
	PendingReview  int `json:"pending_review"`
	ActivePrograms int `json:"active_programs"`
}

// StatusCounts breaks a single content module into published / draft / in-review buckets.
type StatusCounts struct {
	Published int `json:"published"`
	Draft     int `json:"draft"`
	InReview  int `json:"in_review"`
}

// ContentBreakdown groups StatusCounts per content module.
type ContentBreakdown struct {
	Knowledge    StatusCounts `json:"knowledge"`
	News         StatusCounts `json:"news"`
	Announcements StatusCounts `json:"announcements"`
	FAQs         StatusCounts `json:"faqs"`
	Microlearning StatusCounts `json:"microlearning"`
	Training     StatusCounts `json:"training"`
	LearningPaths StatusCounts `json:"learning_paths"`
}

// ReviewItem represents a single entry in the cross-module editorial review queue.
type ReviewItem struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Module    string    `json:"module"`
	Status    string    `json:"status"`
	Author    string    `json:"author"`
	UpdatedAt time.Time `json:"updated_at"`
}

// WorkflowItem represents an item across the 5 editorial lifecycle stages in the Kanban board.
type WorkflowItem struct {
	ID        string    `json:"id"`
	Title     string    `json:"title"`
	Module    string    `json:"module"`
	Status    string    `json:"status"`
	Author    string    `json:"author"`
	UpdatedAt time.Time `json:"updated_at"`
}

// WorkflowFilter defines criteria for querying workflow Kanban items.
type WorkflowFilter struct {
	Module string
	Status string
	Limit  int
}

