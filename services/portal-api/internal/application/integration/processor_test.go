package integration_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	integrationapp "teman-belajar-api/internal/application/integration"
	"teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/repository/postgres"
)

func getTestDB(t *testing.T) *sql.DB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://teman_belajar_portal:secret123456_PORTAL_DB_PASSWORD@localhost:15432/teman_belajar?sslmode=disable"
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Skip("Cannot open database connection")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		t.Skipf("Database not reachable: %v", err)
	}
	return db
}

func TestProcessor_Run_Integration(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	repo := postgres.NewIntegrationRepository(db)
	ctx := context.Background()

	// Seed an event
	now := time.Now().UTC()
	env := &integration.EventEnvelope{
		EventID:       fmt.Sprintf("proc-test-%d", now.UnixNano()),
		EventType:     "learning.user_enrolled",
		Source:        "moodle",
		SubjectID:     "999",
		OccurredAt:    now,
		SchemaVersion: "1.0",
		Payload:       []byte(`{"test":"process"}`),
	}
	inboxEvt := integration.InboxEventFromEnvelope(env)
	res, err := repo.SaveEvent(ctx, inboxEvt)
	if err != nil || !res.Saved {
		t.Fatalf("Failed to save seed event: %v", err)
	}

	cfg := integrationapp.DefaultProcessorConfig()
	cfg.PollInterval = 100 * time.Millisecond // Fast poll
	processor := integrationapp.NewEventProcessor(repo, cfg)

	procCtx, cancel := context.WithCancel(context.Background())
	
	// Start processor
	go processor.Run(procCtx)
	
	// Give it time to process
	time.Sleep(500 * time.Millisecond)
	cancel() // graceful shutdown

	// Verify the event was processed
	var status string
	err = db.QueryRow("SELECT status FROM integration.event_inbox WHERE event_id = $1", env.EventID).Scan(&status)
	if err != nil {
		t.Fatalf("Failed to query status: %v", err)
	}
	if status != integration.StatusProcessed {
		t.Errorf("Expected status 'processed', got %s", status)
	}

	// Verify outbox entry created
	var count int
	err = db.QueryRow("SELECT count(*) FROM integration.event_outbox o JOIN integration.event_inbox i ON o.inbox_event_id = i.id WHERE i.event_id = $1", env.EventID).Scan(&count)
	if err != nil {
		t.Fatalf("Failed to query outbox: %v", err)
	}
	if count != 1 {
		t.Errorf("Expected 1 outbox entry, got %d", count)
	}
}
