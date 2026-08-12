package audit

import "time"

type AuditEvent struct {
	ID          string    `json:"id"`
	ActorUserID string    `json:"actor_user_id"`
	Action      string    `json:"action"`
	TargetType  string    `json:"target_type"`
	TargetID    string    `json:"target_id"`
	Result      string    `json:"result"`
	TraceID     string    `json:"trace_id"`
	OccurredAt  time.Time `json:"occurred_at"`
}
