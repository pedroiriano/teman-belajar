package integration

import (
	"context"
	"fmt"
	"log"
	"time"

	"teman-belajar-api/internal/domain/audit"
	domainintegration "teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/observability"
)

// IngestResult describes the outcome of event ingestion.
type IngestResult string

const (
	IngestAccepted  IngestResult = "accepted"
	IngestDuplicate IngestResult = "duplicate"
	IngestCollision IngestResult = "collision"
)

// EventService handles event ingestion logic.
type EventService struct {
	repo     domainintegration.Repository
	auditRepo audit.Repository
}

// NewEventService creates a new EventService.
func NewEventService(repo domainintegration.Repository, auditRepo audit.Repository) *EventService {
	return &EventService{repo: repo, auditRepo: auditRepo}
}

// IngestEvent validates and idempotently stores an event envelope.
func (s *EventService) IngestEvent(ctx context.Context, envelope *domainintegration.EventEnvelope) (IngestResult, error) {
	if err := domainintegration.ValidateEnvelope(envelope); err != nil {
		metricType := envelope.EventType
		if !domainintegration.SupportedEventTypes[metricType] {
			metricType = "unknown"
		}
		observability.RecordEventIngest(metricType, "rejected")
		return "", err
	}

	event := domainintegration.InboxEventFromEnvelope(envelope)
	result, err := s.repo.SaveEvent(ctx, event)
	if err != nil {
		observability.RecordEventIngest(envelope.EventType, "error")
		return "", err
	}

	if result.Saved {
		observability.RecordEventIngest(envelope.EventType, "accepted")
		log.Printf("Event ingested: event_id=%s type=%s", envelope.EventID, envelope.EventType)
		return IngestAccepted, nil
	}
	if result.Duplicate {
		observability.RecordEventIngest(envelope.EventType, "duplicate")
		return IngestDuplicate, nil
	}

	// Collision: same event_id, different fingerprint — integrity concern
	observability.RecordEventIngest(envelope.EventType, "collision")

	auditEvent := &audit.AuditEvent{
		ID:          "evt-collision-" + envelope.EventID,
		Action:      "moodle_event_collision",
		TargetType:  "event_inbox",
		TargetID:    envelope.EventID,
		Result:      "collision_detected",
		OccurredAt:  event.ReceivedAt,
	}
	if auditErr := s.auditRepo.CreateEvent(ctx, auditEvent); auditErr != nil {
		log.Printf("Failed to record collision audit event: %v", auditErr)
	}

	return IngestCollision, nil
}

// GetSummary returns count of events grouped by status.
func (s *EventService) GetSummary(ctx context.Context) (map[string]int64, error) {
	return s.repo.CountByStatus(ctx)
}

// ListEvents retrieves inbox events according to filter.
func (s *EventService) ListEvents(ctx context.Context, filter domainintegration.EventFilter) ([]*domainintegration.InboxEvent, int64, error) {
	return s.repo.ListEvents(ctx, filter)
}

// GetEvent retrieves a single inbox event by eventID.
func (s *EventService) GetEvent(ctx context.Context, eventID string) (*domainintegration.InboxEvent, error) {
	return s.repo.GetEvent(ctx, eventID)
}

// RequeueEvent resets a dead_letter event to pending and records an audit event.
func (s *EventService) RequeueEvent(ctx context.Context, eventID string, actorUserID string) error {
	if err := s.repo.RequeueDeadLetter(ctx, eventID); err != nil {
		return err
	}

	auditEvent := &audit.AuditEvent{
		ID:          fmt.Sprintf("evt-requeue-%s-%d", eventID, time.Now().UnixNano()),
		ActorUserID: actorUserID,
		Action:      "moodle_event_requeued",
		Module:      "integration",
		TargetType:  "event_inbox",
		TargetID:    eventID,
		Result:      "success",
		OccurredAt:  time.Now().UTC(),
	}
	if s.auditRepo != nil {
		if auditErr := s.auditRepo.CreateEvent(ctx, auditEvent); auditErr != nil {
			log.Printf("Failed to record requeue audit event: %v", auditErr)
		}
	}

	return nil
}

