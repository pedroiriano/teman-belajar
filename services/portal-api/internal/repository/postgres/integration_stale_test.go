package postgres_test

import (
	"context"
	"fmt"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/repository/postgres"
)

func TestIntegrationRepository_StaleWorker(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	repo := postgres.NewIntegrationRepository(db)
	ctx := context.Background()

	// Clean up table for isolated tests
	db.Exec("TRUNCATE TABLE integration.event_inbox CASCADE")
	db.Exec("TRUNCATE TABLE integration.event_outbox CASCADE")
	
	now := time.Now().UTC()
	env := &integration.EventEnvelope{
		EventID:       fmt.Sprintf("stale-test-%d", now.UnixNano()),
		EventType:     "learning.user_enrolled",
		Source:        "moodle",
		SubjectID:     "123",
		OccurredAt:    now,
		SchemaVersion: "1.0",
		Payload:       []byte(`{"foo":"bar"}`),
	}
	
	inboxEvt := integration.InboxEventFromEnvelope(env)
	_, err := repo.SaveEvent(ctx, inboxEvt)
	if err != nil {
		t.Fatalf("Failed to save event: %v", err)
	}

	// Claim it (Worker A)
	events, err := repo.ClaimPendingEvents(ctx, 1, 5*time.Minute)
	if err != nil || len(events) != 1 {
		t.Fatalf("Failed to claim event")
	}
	claimedEvent := events[0]

	// Simulate time passing and Worker B stealing the lease
	_, err = db.Exec("UPDATE integration.event_inbox SET updated_at = NOW() - interval '6 minutes' WHERE event_id = $1", env.EventID)
	if err != nil {
		t.Fatalf("Failed to artificially age event: %v", err)
	}

	eventsB, err := repo.ClaimPendingEvents(ctx, 1, 5*time.Minute)
	if err != nil || len(eventsB) != 1 {
		t.Fatalf("Worker B failed to steal stale lease")
	}

	t.Logf("Worker B updated_at: %v", eventsB[0].UpdatedAt)

	// Worker A tries to mark it as processed
	tx, err := repo.BeginTx(ctx)
	if err != nil {
		t.Fatalf("Failed to begin tx: %v", err)
	}
	err = repo.MarkProcessed(ctx, tx, claimedEvent)
	t.Logf("MarkProcessed returned: %v", err)
	if err == nil {
		t.Fatalf("Expected stale worker to fail MarkProcessed, but it succeeded")
	}
	tx.Rollback()

	// Worker A tries to mark it as failed
	err = repo.MarkFailed(ctx, claimedEvent, "some_error", 5, 30*time.Second)
	t.Logf("MarkFailed returned: %v", err)
	if err == nil {
		t.Fatalf("Expected stale worker to fail MarkFailed, but it succeeded")
	}
}

func TestIntegrationRepository_DeadLetter(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	repo := postgres.NewIntegrationRepository(db)
	ctx := context.Background()

	// Clean up table for isolated tests
	db.Exec("TRUNCATE TABLE integration.event_inbox CASCADE")
	db.Exec("TRUNCATE TABLE integration.event_outbox CASCADE")
	
	now := time.Now().UTC()
	env := &integration.EventEnvelope{
		EventID:       fmt.Sprintf("dlq-test-%d", now.UnixNano()),
		EventType:     "learning.user_enrolled",
		Source:        "moodle",
		SubjectID:     "123",
		OccurredAt:    now,
		SchemaVersion: "1.0",
		Payload:       []byte(`{"dlq":"true"}`),
	}
	
	inboxEvt := integration.InboxEventFromEnvelope(env)
	repo.SaveEvent(ctx, inboxEvt)

	// Claim it
	events, _ := repo.ClaimPendingEvents(ctx, 1, 5*time.Minute)
	claimedEvent := events[0]

	// Fail it multiple times to trigger dead_letter
	for i := 0; i < 5; i++ {
		err := repo.MarkFailed(ctx, claimedEvent, "test_fail", 5, 1*time.Millisecond)
		if err != nil {
			t.Fatalf("Failed to mark failed: %v", err)
		}
		if i < 4 {
			claimedEvent.Attempts++
			// Reset next_attempt_at for immediate claim
			db.Exec("UPDATE integration.event_inbox SET next_attempt_at = NOW() WHERE event_id = $1", env.EventID)
			reclaimed, _ := repo.ClaimPendingEvents(ctx, 1, 5*time.Minute)
			claimedEvent = reclaimed[0]
		}
	}

	// Check status
	var status string
	db.QueryRow("SELECT status FROM integration.event_inbox WHERE event_id = $1", env.EventID).Scan(&status)
	if status != integration.StatusDeadLetter {
		t.Fatalf("Expected status dead_letter, got %s", status)
	}

	// List DLQ
	dlq, err := repo.ListDeadLetter(ctx, 10, 0)
	if err != nil {
		t.Fatalf("ListDeadLetter failed: %v", err)
	}
	found := false
	for _, e := range dlq {
		if e.EventID == env.EventID {
			found = true
			break
		}
	}
	if !found {
		t.Fatalf("Event not found in DLQ list")
	}

	// Requeue
	err = repo.RequeueDeadLetter(ctx, env.EventID)
	if err != nil {
		t.Fatalf("RequeueDeadLetter failed: %v", err)
	}

	db.QueryRow("SELECT status FROM integration.event_inbox WHERE event_id = $1", env.EventID).Scan(&status)
	if status != integration.StatusPending {
		t.Fatalf("Expected status pending after requeue, got %s", status)
	}
}
