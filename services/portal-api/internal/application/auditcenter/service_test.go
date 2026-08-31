package auditcenter

import (
	"context"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/audit"
)

type memoryRepository struct {
	items       []audit.AuditEvent
	cutoff      time.Time
	deleteLimit int
}

func (repository *memoryRepository) CreateEvent(context.Context, *audit.AuditEvent) error { return nil }
func (repository *memoryRepository) ListEvents(_ context.Context, query audit.Query) ([]audit.AuditEvent, error) {
	if query.Limit < len(repository.items) {
		return repository.items[:query.Limit], nil
	}
	return repository.items, nil
}
func (repository *memoryRepository) GetEvent(_ context.Context, id string) (audit.AuditEvent, error) {
	for _, event := range repository.items {
		if event.ID == id {
			return event, nil
		}
	}
	return audit.AuditEvent{}, errors.New("not found")
}
func (repository *memoryRepository) DeleteBefore(_ context.Context, cutoff time.Time, limit int) (int64, error) {
	repository.cutoff, repository.deleteLimit = cutoff, limit
	return 3, nil
}

func TestListCursorExportBoundsAndRetention(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	repository := &memoryRepository{}
	for index := 0; index < 3; index++ {
		repository.items = append(repository.items, audit.AuditEvent{ID: "00000000-0000-4000-8000-00000000000" + string(rune('1'+index)), Action: "VIEWED", Module: "audit", TargetType: "audit", TargetID: "safe", Result: "SUCCESS", OccurredAt: now.Add(-time.Duration(index) * time.Minute)})
	}
	service := NewService(repository)
	service.now = func() time.Time { return now }
	page, err := service.List(context.Background(), audit.Query{Limit: 2}, "")
	if err != nil || len(page.Items) != 2 || page.NextCursor == "" {
		t.Fatalf("page=%#v err=%v", page, err)
	}
	if _, err := service.Export(context.Background(), audit.Query{}); !errors.Is(err, ErrExportRange) {
		t.Fatalf("export without range err=%v", err)
	}
	items, err := service.Export(context.Background(), audit.Query{OccurredFrom: now.Add(-24 * time.Hour), OccurredTo: now})
	if err != nil || len(items) != 3 {
		t.Fatalf("export items=%d err=%v", len(items), err)
	}
	removed, err := service.PurgeExpired(context.Background())
	if err != nil || removed != 3 || repository.deleteLimit != retentionBatch || !repository.cutoff.Equal(now.AddDate(0, 0, -RetentionDays)) {
		t.Fatalf("retention removed=%d cutoff=%v limit=%d err=%v", removed, repository.cutoff, repository.deleteLimit, err)
	}
}
