package postgres_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/repository/postgres"
)

func getTestDB(t *testing.T) *sql.DB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://teman_belajar_portal:secret123456_PORTAL_DB_PASSWORD@localhost:15432/teman_belajar?sslmode=disable"
	}
	db, err := sql.Open("postgres", dsn)
	
	reqEnv := os.Getenv("TASK011_REQUIRE_INTEGRATION_DB") == "true"
	if err != nil {
		if reqEnv {
			t.Fatalf("Cannot open database connection: %v", err)
		}
		t.Skip("Cannot open database connection")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		if reqEnv {
			t.Fatalf("Database not reachable but TASK011_REQUIRE_INTEGRATION_DB is true: %v", err)
		}
		t.Skipf("Database not reachable: %v", err)
	}
	return db
}

func TestIntegrationRepository_SaveEvent_Idempotency(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	repo := postgres.NewIntegrationRepository(db)

	ctx := context.Background()
	
	// Create unique event for testing
	now := time.Now().UTC()
	env := &integration.EventEnvelope{
		EventID:       fmt.Sprintf("test-evt-%d", now.UnixNano()),
		EventType:     "learning.user_enrolled",
		Source:        "moodle",
		SubjectID:     "123",
		OccurredAt:    now,
		SchemaVersion: "1.0",
		Payload:       []byte(`{"foo":"bar"}`),
	}
	
	inboxEvt1 := integration.InboxEventFromEnvelope(env)
	
	// Save first time
	res1, err := repo.SaveEvent(ctx, inboxEvt1)
	if err != nil {
		t.Fatalf("Failed to save event: %v", err)
	}
	if !res1.Saved || res1.Duplicate || res1.Collision {
		t.Errorf("Expected Saved=true, got %+v", res1)
	}

	// Save second time (Exact Duplicate)
	inboxEvt2 := integration.InboxEventFromEnvelope(env)
	res2, err := repo.SaveEvent(ctx, inboxEvt2)
	if err != nil {
		t.Fatalf("Failed to save event duplicate: %v", err)
	}
	if !res2.Duplicate || res2.Saved || res2.Collision {
		t.Errorf("Expected Duplicate=true, got %+v", res2)
	}

	// Save third time with modified payload (Collision)
	envCollision := *env
	envCollision.Payload = []byte(`{"foo":"baz"}`) // modified
	inboxEvt3 := integration.InboxEventFromEnvelope(&envCollision)
	res3, err := repo.SaveEvent(ctx, inboxEvt3)
	if err != nil {
		t.Fatalf("Failed to save event collision: %v", err)
	}
	if !res3.Collision || res3.Saved || res3.Duplicate {
		t.Errorf("Expected Collision=true, got %+v", res3)
	}
}
