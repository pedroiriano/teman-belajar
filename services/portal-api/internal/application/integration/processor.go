package integration

import (
	"context"
	"encoding/json"
	"log"
	"time"

	domainintegration "teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/observability"
)

// ProcessorConfig holds configuration for the async event processor.
type ProcessorConfig struct {
	MaxAttempts    int
	BackoffBase   time.Duration
	BatchSize     int
	PollInterval  time.Duration
	StaleThreshold time.Duration
}

// DefaultProcessorConfig returns the approved default configuration.
func DefaultProcessorConfig() ProcessorConfig {
	return ProcessorConfig{
		MaxAttempts:    5,
		BackoffBase:   30 * time.Second,
		BatchSize:     10,
		PollInterval:  5 * time.Second,
		StaleThreshold: 5 * time.Minute,
	}
}

// EventProcessor is an async background worker that processes pending inbox events.
type EventProcessor struct {
	repo   domainintegration.Repository
	config ProcessorConfig
}

// NewEventProcessor creates a new EventProcessor.
func NewEventProcessor(repo domainintegration.Repository, config ProcessorConfig) *EventProcessor {
	return &EventProcessor{repo: repo, config: config}
}

// Run starts the processing loop. It blocks until ctx is cancelled.
func (p *EventProcessor) Run(ctx context.Context) {
	log.Println("Event processor started")
	defer log.Println("Event processor stopped")

	ticker := time.NewTicker(p.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			p.processBatch(ctx)
			p.updateMetrics(ctx)
		}
	}
}

// processBatch claims and processes a batch of pending events.
func (p *EventProcessor) processBatch(ctx context.Context) {
	events, err := p.repo.ClaimPendingEvents(ctx, p.config.BatchSize, p.config.StaleThreshold)
	if err != nil {
		log.Printf("Failed to claim pending events: %v", err)
		return
	}

	for _, event := range events {
		if ctx.Err() != nil {
			return
		}
		p.processEvent(ctx, event)
	}
}

// processEvent processes a single inbox event within a transaction:
// marks it as processed and creates an outbox entry atomically.
func (p *EventProcessor) processEvent(ctx context.Context, event *domainintegration.InboxEvent) {
	start := time.Now()

	tx, err := p.repo.BeginTx(ctx)
	if err != nil {
		log.Printf("Failed to begin tx for event %s: %v", event.EventID, err)
		p.handleFailure(ctx, event, "tx_begin_failed")
		return
	}

	// Process: create outbox entry for downstream consumption (ADR-011).
	outboxPayload, _ := json.Marshal(map[string]interface{}{
		"event_id":   event.EventID,
		"event_type": event.EventType,
		"source":     event.Source,
		"subject_id": event.SubjectID,
	})

	outboxEntry := &domainintegration.OutboxEvent{
		InboxEventID: event.ID,
		EventType:    event.EventType,
		Payload:      outboxPayload,
		Published:    false,
	}

	if err := p.repo.CreateOutboxEntry(ctx, tx, outboxEntry); err != nil {
		_ = tx.Rollback() // #nosec G104 -- rollback error after outbox failure is non-actionable
		log.Printf("Failed to create outbox entry for event %s: %v", event.EventID, err)
		p.handleFailure(ctx, event, "outbox_create_failed")
		return
	}

	if err := p.repo.MarkProcessed(ctx, tx, event); err != nil {
		_ = tx.Rollback() // #nosec G104 -- rollback error after mark-processed failure is non-actionable
		log.Printf("Failed to mark event %s as processed: %v", event.EventID, err)
		p.handleFailure(ctx, event, "mark_processed_failed")
		return
	}

	if err := tx.Commit(); err != nil {
		log.Printf("Failed to commit tx for event %s: %v", event.EventID, err)
		p.handleFailure(ctx, event, "tx_commit_failed")
		return
	}

	duration := time.Since(start).Seconds()
	observability.RecordEventProcess(event.EventType, "success")
	observability.RecordEventProcessDuration(event.EventType, duration)
	log.Printf("Event processed: event_id=%s type=%s duration=%.3fs", event.EventID, event.EventType, duration)
}

// handleFailure marks an event as failed with bounded retry or dead-letter.
func (p *EventProcessor) handleFailure(ctx context.Context, event *domainintegration.InboxEvent, errCategory string) {
	if err := p.repo.MarkFailed(ctx, event, errCategory, p.config.MaxAttempts, p.config.BackoffBase); err != nil {
		log.Printf("Failed to mark event %s as failed: %v", event.EventID, err)
		return // Do not record metric as transition did not succeed
	}

	newAttempts := event.Attempts + 1
	if newAttempts >= p.config.MaxAttempts {
		observability.RecordEventProcess(event.EventType, "dead_letter")
		log.Printf("Event moved to dead-letter: event_id=%s type=%s attempts=%d", event.EventID, event.EventType, newAttempts)
	} else {
		observability.RecordEventProcess(event.EventType, "retry")
	}
}

// updateMetrics queries current inbox state and updates Prometheus gauges.
func (p *EventProcessor) updateMetrics(ctx context.Context) {
	counts, err := p.repo.CountByStatus(ctx)
	if err != nil {
		return
	}
	for _, status := range []string{
		domainintegration.StatusPending,
		domainintegration.StatusProcessing,
		domainintegration.StatusDeadLetter,
	} {
		observability.SetEventInboxBacklog(status, float64(counts[status]))
	}
}
