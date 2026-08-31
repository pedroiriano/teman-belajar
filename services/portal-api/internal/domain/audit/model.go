package audit

import "time"

type AuditEvent struct {
	ID          string            `json:"id"`
	ActorUserID string            `json:"actor_user_id,omitempty"`
	Action      string            `json:"event"`
	Module      string            `json:"module"`
	TargetType  string            `json:"target_type"`
	TargetID    string            `json:"target_id"`
	Result      string            `json:"result"`
	TraceID     string            `json:"correlation_id,omitempty"`
	IPMasked    string            `json:"ip_masked,omitempty"`
	Metadata    map[string]string `json:"metadata,omitempty"`
	OccurredAt  time.Time         `json:"occurred_at"`
}

type Query struct {
	ActorUserID    string
	Action         string
	Module         string
	TargetType     string
	TargetID       string
	Result         string
	TraceID        string
	OccurredFrom   time.Time
	OccurredTo     time.Time
	BeforeOccurred time.Time
	BeforeID       string
	Limit          int
}

type Page struct {
	Items      []AuditEvent `json:"items"`
	NextCursor string       `json:"next_cursor,omitempty"`
}
