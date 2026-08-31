package postgres

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/audit"
)

func TestAuditRepositoryQueryDetailAndRetention(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required for audit repository integration")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	ids := []string{"a0190000-0000-4000-8000-000000000001", "a0190000-0000-4000-8000-000000000002"}
	defer func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM audit_events WHERE id IN ($1::uuid,$2::uuid)`, ids[0], ids[1])
	}()
	repository := NewAuditRepository(db)
	for index, id := range ids {
		event := &audit.AuditEvent{ID: id, Action: "TASK019_FIXTURE", Module: "audit", TargetType: "fixture", TargetID: id, Result: "SUCCESS", OccurredAt: time.Now().UTC().Add(time.Duration(index-2) * time.Hour)}
		if err := repository.CreateEvent(ctx, event); err != nil {
			t.Fatal(err)
		}
	}
	items, err := repository.ListEvents(ctx, audit.Query{Action: "TASK019_FIXTURE", Limit: 10})
	if err != nil || len(items) != 2 {
		t.Fatalf("items=%d err=%v", len(items), err)
	}
	if detail, err := repository.GetEvent(ctx, ids[0]); err != nil || detail.Module != "audit" {
		t.Fatalf("detail=%#v err=%v", detail, err)
	}
	removed, err := repository.DeleteBefore(ctx, time.Now().UTC().Add(-90*time.Minute), 1)
	if err != nil || removed != 1 {
		t.Fatalf("removed=%d err=%v", removed, err)
	}
}
