package schedule

import (
	"context"
	"testing"
	"time"
)

type mockRepo struct {
	events []ScheduleEvent
}

func (m *mockRepo) List(ctx context.Context, month string, entityType string) ([]ScheduleEvent, error) {
	return m.events, nil
}
func (m *mockRepo) Create(ctx context.Context, ev ScheduleEvent) (*ScheduleEvent, error) {
	ev.ID = "sched-123"
	m.events = append(m.events, ev)
	return &ev, nil
}
func (m *mockRepo) GetByID(ctx context.Context, id string) (*ScheduleEvent, error) {
	for _, e := range m.events {
		if e.ID == id {
			return &e, nil
		}
	}
	return nil, ErrNotFound
}
func (m *mockRepo) GetPendingExecution(ctx context.Context, cutoff time.Time, limit int) ([]ScheduleEvent, error) {
	var pending []ScheduleEvent
	for _, e := range m.events {
		if e.Status == "scheduled" && !e.PublishAt.After(cutoff) {
			pending = append(pending, e)
		}
	}
	return pending, nil
}
func (m *mockRepo) MarkExecuted(ctx context.Context, id string, executedAt time.Time) error {
	for i, e := range m.events {
		if e.ID == id {
			m.events[i].Status = "published"
			m.events[i].ExecutedAt = &executedAt
			return nil
		}
	}
	return ErrNotFound
}
func (m *mockRepo) MarkFailed(ctx context.Context, id string, reason string) error {
	for i, e := range m.events {
		if e.ID == id {
			m.events[i].Status = "failed"
			m.events[i].FailureReason = &reason
			return nil
		}
	}
	return ErrNotFound
}
func (m *mockRepo) Cancel(ctx context.Context, id string) error {
	for i, e := range m.events {
		if e.ID == id {
			m.events[i].Status = "cancelled"
			return nil
		}
	}
	return ErrNotFound
}

type mockPublisher struct {
	published []string
}

func (p *mockPublisher) PublishEntity(ctx context.Context, entityType string, entityID string) error {
	p.published = append(p.published, entityType+":"+entityID)
	return nil
}

func TestScheduleService_CreateAndListWithConflict(t *testing.T) {
	repo := &mockRepo{}
	pub := &mockPublisher{}
	svc := NewService(repo, pub)
	ctx := context.Background()

	// 1. Create first schedule
	ev1, err := svc.Create(ctx, CreateScheduleInput{
		Title:      "Pelatihan Digital ASN",
		TargetDate: "2026-09-15",
		TargetTime: "09:00",
		Module:     "Pelatihan",
		Owner:      "Admin",
	})
	if err != nil {
		t.Fatalf("create ev1 failed: %v", err)
	}
	if ev1.Status != "scheduled" {
		t.Fatalf("expected scheduled, got %s", ev1.Status)
	}

	// 2. Create second schedule at the exact same slot (conflict)
	ev2, err := svc.Create(ctx, CreateScheduleInput{
		Title:      "Surat Edaran Pembelajaran",
		TargetDate: "2026-09-15",
		TargetTime: "09:00",
		Module:     "Pengumuman",
		Owner:      "Biro",
	})
	if err != nil {
		t.Fatalf("create ev2 failed: %v", err)
	}
	if ev2.ID == "" {
		t.Fatalf("expected ID, got empty")
	}

	// 3. List
	listRes, err := svc.List(ctx, "2026-09", "all")
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(listRes.Events) != 2 {
		t.Fatalf("expected 2 events, got %d", len(listRes.Events))
	}
	if listRes.ConflictCount != 2 {
		t.Fatalf("expected 2 conflicted items, got %d", listRes.ConflictCount)
	}
	if !listRes.Events[0].HasConflict || !listRes.Events[1].HasConflict {
		t.Fatalf("both events should report has_conflict = true")
	}

	// 4. Test auto-publish execution
	// Artificially move cutoff past event publishAt
	cutoff := ev1.PublishAt.Add(1 * time.Hour)
	executed, err := svc.ExecutePending(ctx, cutoff)
	if err != nil {
		t.Fatalf("execute pending failed: %v", err)
	}
	if executed != 2 {
		t.Fatalf("expected 2 executed, got %d", executed)
	}
	if len(pub.published) != 2 {
		t.Fatalf("expected 2 entities published, got %d", len(pub.published))
	}
}
