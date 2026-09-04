package reviewnote

import "time"

// ReviewNote represents an editorial feedback comment recorded by a reviewer.
type ReviewNote struct {
	ID           string    `json:"id"`
	EntityType   string    `json:"entity_type"`
	EntityID     string    `json:"entity_id"`
	Action       string    `json:"action"` // request_changes, reject, approve
	Notes        string    `json:"notes"`
	ReviewerID   string    `json:"reviewer_id"`
	ReviewerName string    `json:"reviewer_name"`
	CreatedAt    time.Time `json:"created_at"`
}

// CreateReviewNoteInput holds input to record review feedback.
type CreateReviewNoteInput struct {
	EntityType   string `json:"entity_type"`
	EntityID     string `json:"entity_id"`
	Action       string `json:"action"`
	Notes        string `json:"notes"`
	ReviewerID   string `json:"reviewer_id"`
	ReviewerName string `json:"reviewer_name"`
}
