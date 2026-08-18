package search

import "time"

// IndexDocument is derived, engine-neutral data. It must never contain learner-
// specific progress, identity, enrolment, grades, email addresses, or tokens.
type IndexDocument struct {
	DocumentID   string     `json:"document_id"`
	SourceType   string     `json:"source_type"`
	SourceID     string     `json:"source_id"`
	Title        string     `json:"title"`
	Summary      string     `json:"summary"`
	BodyText     string     `json:"body_text"`
	CategoryID   string     `json:"category_id,omitempty"`
	CategoryName string     `json:"category_name,omitempty"`
	Tags         []string   `json:"tags"`
	URL          string     `json:"url"`
	PublishedAt  *time.Time `json:"published_at,omitempty"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Generation   string     `json:"generation"`
}
