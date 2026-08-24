package integration

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// Supported event types from canonical Moodle integration specification.
var SupportedEventTypes = map[string]bool{
	"learning.user_enrolled":      true,
	"learning.course_completed":   true,
	"learning.activity_completed": true,
	"learning.badge_awarded":      true,
	"learning.certificate_issued": true,
	"learning.course_updated":     true,
}

// SupportedSchemaVersions defines accepted schema versions.
var SupportedSchemaVersions = map[string]bool{
	"1.0": true,
}

// Inbox status constants.
const (
	StatusPending    = "pending"
	StatusProcessing = "processing"
	StatusProcessed  = "processed"
	StatusDeadLetter = "dead_letter"
)

// EventEnvelope is the canonical event contract received from Moodle/plugin.
type EventEnvelope struct {
	EventID       string          `json:"event_id"`
	EventType     string          `json:"event_type"`
	OccurredAt    time.Time       `json:"occurred_at"`
	Source        string          `json:"source"`
	SubjectID     string          `json:"subject_id"`
	Payload       json.RawMessage `json:"payload"`
	SchemaVersion string          `json:"schema_version"`
}

// InboxEvent represents a persisted event in integration.event_inbox.
type InboxEvent struct {
	ID             int64
	EventID        string
	EventType      string
	Source         string
	SubjectID      string
	OccurredAt     time.Time
	SchemaVersion  string
	Payload        json.RawMessage
	Fingerprint    string
	Status         string
	Attempts       int
	NextAttemptAt  *time.Time
	ErrorCategory  *string
	ReceivedAt     time.Time
	ProcessedAt    *time.Time
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

// OutboxEvent represents a row in integration.event_outbox.
type OutboxEvent struct {
	ID           int64
	InboxEventID int64
	EventType    string
	Payload      json.RawMessage
	Published    bool
	CreatedAt    time.Time
}

// ValidateEnvelope checks all required fields and supported values.
func ValidateEnvelope(e *EventEnvelope) error {
	if strings.TrimSpace(e.EventID) == "" {
		return fmt.Errorf("event_id is required")
	}
	if len(e.EventID) > 128 {
		return fmt.Errorf("event_id exceeds maximum length of 128")
	}
	if strings.TrimSpace(e.EventType) == "" {
		return fmt.Errorf("event_type is required")
	}
	if len(e.EventType) > 128 {
		return fmt.Errorf("event_type exceeds maximum length of 128")
	}
	if !SupportedEventTypes[e.EventType] {
		return fmt.Errorf("unsupported event_type: %s", e.EventType)
	}
	if e.OccurredAt.IsZero() {
		return fmt.Errorf("occurred_at is required")
	}
	if strings.TrimSpace(e.Source) == "" {
		return fmt.Errorf("source is required")
	}
	if len(e.Source) > 128 {
		return fmt.Errorf("source exceeds maximum length of 128")
	}
	if strings.TrimSpace(e.SubjectID) == "" {
		return fmt.Errorf("subject_id is required")
	}
	if len(e.SubjectID) > 128 {
		return fmt.Errorf("subject_id exceeds maximum length of 128")
	}
	if strings.TrimSpace(e.SchemaVersion) == "" {
		return fmt.Errorf("schema_version is required")
	}
	if !SupportedSchemaVersions[e.SchemaVersion] {
		return fmt.Errorf("unsupported schema_version: %s", e.SchemaVersion)
	}
	if len(e.Payload) == 0 || string(e.Payload) == "null" {
		return fmt.Errorf("payload is required and cannot be null")
	}
	// Verify payload is valid JSON object
	var obj map[string]interface{}
	if err := json.Unmarshal(e.Payload, &obj); err != nil {
		return fmt.Errorf("payload must be a valid JSON object")
	}
	return nil
}

// ComputeFingerprint produces a deterministic SHA-256 hash of the canonical
// envelope fields. This is used to detect collision (same event_id, different
// content) without exposing the raw payload in comparison logic.
func ComputeFingerprint(e *EventEnvelope) string {
	// Normalize payload by re-marshalling through compact JSON
	var compactPayload json.RawMessage
	if err := json.Unmarshal(e.Payload, &compactPayload); err == nil {
		buf, _ := json.Marshal(json.RawMessage(compactPayload))
		compactPayload = buf
	} else {
		compactPayload = e.Payload
	}

	canonical := fmt.Sprintf("%s|%s|%s|%s|%s|%s|%s",
		e.EventID,
		e.EventType,
		e.Source,
		e.SubjectID,
		e.OccurredAt.UTC().Format(time.RFC3339Nano),
		e.SchemaVersion,
		string(compactPayload),
	)
	hash := sha256.Sum256([]byte(canonical))
	return fmt.Sprintf("%x", hash)
}

// InboxEventFromEnvelope creates an InboxEvent from a validated envelope.
func InboxEventFromEnvelope(e *EventEnvelope) *InboxEvent {
	now := time.Now().UTC()
	return &InboxEvent{
		EventID:       e.EventID,
		EventType:     e.EventType,
		Source:        e.Source,
		SubjectID:     e.SubjectID,
		OccurredAt:    e.OccurredAt.UTC(),
		SchemaVersion: e.SchemaVersion,
		Payload:       e.Payload,
		Fingerprint:   ComputeFingerprint(e),
		Status:        StatusPending,
		Attempts:      0,
		ReceivedAt:    now,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
}
