package schedule

import (
	"time"
)

// ScheduleEvent represents a scheduled publication entry in the database.
type ScheduleEvent struct {
	ID                string     `json:"id"`
	EntityType        string     `json:"entity_type"`
	EntityID          string     `json:"entity_id"`
	Title             string     `json:"title"`
	TargetDate        string     `json:"target_date"` // YYYY-MM-DD
	TargetTime        string     `json:"target_time"` // HH:mm
	PublishAt         time.Time  `json:"publish_at"`
	Status            string     `json:"status"` // scheduled, published, cancelled, failed
	Owner             string     `json:"owner"`
	CohortLabel       *string    `json:"cohort_label,omitempty"`
	ParticipantsCount int        `json:"participants_count"`
	Description       *string    `json:"description,omitempty"`
	ExecutedAt        *time.Time `json:"executed_at,omitempty"`
	FailureReason     *string    `json:"failure_reason,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`

	// Enriched fields for Admin calendar view
	Module          string  `json:"module"`
	StatusLabel     string  `json:"status_label"`
	HasConflict     bool    `json:"has_conflict"`
	ConflictDetails *string `json:"conflict_details,omitempty"`
}

// CreateScheduleInput holds validated payload to schedule a publication.
type CreateScheduleInput struct {
	EntityType        string  `json:"entity_type"`
	EntityID          string  `json:"entity_id"`
	Title             string  `json:"title"`
	Module            string  `json:"module"`
	TargetDate        string  `json:"target_date"` // YYYY-MM-DD
	TargetTime        string  `json:"target_time"` // HH:mm
	Owner             string  `json:"owner"`
	CohortLabel       *string `json:"cohort_label,omitempty"`
	ParticipantsCount int     `json:"participants_count"`
	Description       *string `json:"description,omitempty"`
}

// ListResult holds list of schedule events and the count of conflict slots.
type ListResult struct {
	Events        []ScheduleEvent `json:"data"`
	ConflictCount int             `json:"conflict_count"`
}
