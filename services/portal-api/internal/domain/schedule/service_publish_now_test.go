package schedule_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/notification"
	"teman-belajar-api/internal/domain/schedule"
)

type mockRepo struct {
	events     map[string]schedule.ScheduleEvent
	candidates []schedule.ScheduleCandidate
}

func newMockRepo() *mockRepo {
	return &mockRepo{
		events: make(map[string]schedule.ScheduleEvent),
		candidates: []schedule.ScheduleCandidate{
			{
				ID:         "news-1",
				Title:      "Berita Masa Depan",
				EntityType: "news",
				Module:     "Berita",
				Status:     "draft",
			},
			{
				ID:         "know-1",
				Title:      "Panduan Teknis",
				EntityType: "knowledge",
				Module:     "Pengetahuan",
				Status:     "in_review",
			},
		},
	}
}

func (m *mockRepo) List(ctx context.Context, month string, entityType string) ([]schedule.ScheduleEvent, error) {
	var list []schedule.ScheduleEvent
	for _, ev := range m.events {
		if entityType != "" && ev.EntityType != entityType {
			continue
		}
		list = append(list, ev)
	}
	return list, nil
}

func (m *mockRepo) Create(ctx context.Context, event schedule.ScheduleEvent) (*schedule.ScheduleEvent, error) {
	if event.ID == "" {
		event.ID = "sched-" + event.EntityID
	}
	m.events[event.ID] = event
	return &event, nil
}

func (m *mockRepo) GetByID(ctx context.Context, id string) (*schedule.ScheduleEvent, error) {
	ev, ok := m.events[id]
	if !ok {
		return nil, schedule.ErrNotFound
	}
	return &ev, nil
}

func (m *mockRepo) GetCandidates(ctx context.Context, entityType string) ([]schedule.ScheduleCandidate, error) {
	var res []schedule.ScheduleCandidate
	for _, c := range m.candidates {
		if entityType != "" && c.EntityType != entityType {
			continue
		}
		res = append(res, c)
	}
	return res, nil
}

func (m *mockRepo) GetPendingExecution(ctx context.Context, cutoff time.Time, limit int) ([]schedule.ScheduleEvent, error) {
	var res []schedule.ScheduleEvent
	for _, ev := range m.events {
		if ev.Status == "scheduled" && !ev.PublishAt.After(cutoff) {
			res = append(res, ev)
		}
	}
	return res, nil
}

func (m *mockRepo) MarkExecuted(ctx context.Context, id string, executedAt time.Time) error {
	ev, ok := m.events[id]
	if !ok {
		return schedule.ErrNotFound
	}
	ev.Status = "published"
	ev.ExecutedAt = &executedAt
	m.events[id] = ev
	return nil
}

func (m *mockRepo) MarkFailed(ctx context.Context, id string, reason string) error {
	ev, ok := m.events[id]
	if !ok {
		return schedule.ErrNotFound
	}
	ev.Status = "failed"
	ev.FailureReason = &reason
	m.events[id] = ev
	return nil
}

func (m *mockRepo) Cancel(ctx context.Context, id string) error {
	ev, ok := m.events[id]
	if !ok {
		return schedule.ErrNotFound
	}
	ev.Status = "cancelled"
	m.events[id] = ev
	return nil
}

type mockPublisher struct {
	failType          string
	published         []string
	scheduledEntities []string
}

func (p *mockPublisher) PublishEntity(ctx context.Context, entityType string, entityID string) error {
	if entityType == p.failType {
		return errors.New("simulated publication failure")
	}
	p.published = append(p.published, entityType+":"+entityID)
	return nil
}

func (p *mockPublisher) SetEntityScheduled(ctx context.Context, entityType string, entityID string) error {
	p.scheduledEntities = append(p.scheduledEntities, entityType+":"+entityID)
	return nil
}

type mockAuditRepo struct {
	events []audit.AuditEvent
}

func (a *mockAuditRepo) CreateEvent(ctx context.Context, ev *audit.AuditEvent) error {
	a.events = append(a.events, *ev)
	return nil
}
func (a *mockAuditRepo) QueryEvents(ctx context.Context, q audit.Query) (audit.Page, error) {
	return audit.Page{}, nil
}
func (a *mockAuditRepo) CountEvents(ctx context.Context, q audit.Query) (int, error) {
	return len(a.events), nil
}
func (a *mockAuditRepo) CleanupOldEvents(ctx context.Context, retentionDays int) (int64, error) {
	return 0, nil
}

type mockNotifRepo struct {
	delivered []notification.Delivery
}

func (n *mockNotifRepo) Deliver(ctx context.Context, d notification.Delivery, notif notification.Notification) (notification.DeliveryResult, error) {
	n.delivered = append(n.delivered, d)
	return notification.DeliveryResult{Notification: &notif, Created: true}, nil
}
func (n *mockNotifRepo) CancelPending(ctx context.Context, s string, a notification.Audience, e []string, t time.Time) (int, error) {
	return 0, nil
}
func (n *mockNotifRepo) List(ctx context.Context, s string, f notification.ListFilter) (notification.Page, error) {
	return notification.Page{}, nil
}
func (n *mockNotifRepo) UnreadCount(ctx context.Context, s string, a notification.Audience) (int, error) {
	return 0, nil
}
func (n *mockNotifRepo) MarkRead(ctx context.Context, s string, a notification.Audience, id string) (*notification.Notification, error) {
	return nil, nil
}
func (n *mockNotifRepo) MarkAllRead(ctx context.Context, s string, a notification.Audience) (int, error) {
	return 0, nil
}
func (n *mockNotifRepo) ListPreferences(ctx context.Context, s string, a notification.Audience) ([]notification.Preference, error) {
	return nil, nil
}
func (n *mockNotifRepo) SetPreference(ctx context.Context, s string, a notification.Audience, et notification.EventType, e bool) (notification.Preference, error) {
	return notification.Preference{}, nil
}

func TestScheduleService_GetCandidates(t *testing.T) {
	repo := newMockRepo()
	svc := schedule.NewService(repo, nil)

	candidates, err := svc.GetCandidates(context.Background(), "news")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(candidates) != 1 {
		t.Fatalf("expected 1 candidate, got %d", len(candidates))
	}
	if candidates[0].Module != "Berita" {
		t.Fatalf("expected module 'Berita', got '%s'", candidates[0].Module)
	}
}

func TestScheduleService_Create_WithRealEntity(t *testing.T) {
	repo := newMockRepo()
	pub := &mockPublisher{}
	svc := schedule.NewService(repo, pub)

	event, err := svc.Create(context.Background(), schedule.CreateScheduleInput{
		Title:      "Rilis Berita Q3",
		TargetDate: "2026-09-15",
		TargetTime: "10:00",
		EntityType: "news",
		EntityID:   "real-uuid-123",
	})
	if err != nil {
		t.Fatalf("unexpected create error: %v", err)
	}

	if event.Status != "scheduled" {
		t.Fatalf("expected status scheduled, got %s", event.Status)
	}
	if len(pub.scheduledEntities) != 1 || pub.scheduledEntities[0] != "news:real-uuid-123" {
		t.Fatalf("expected entity to be marked scheduled, got %v", pub.scheduledEntities)
	}
}

func TestScheduleService_PublishNow_Success(t *testing.T) {
	repo := newMockRepo()
	pub := &mockPublisher{}
	auditR := &mockAuditRepo{}
	notifR := &mockNotifRepo{}

	svc := schedule.NewService(repo, pub)
	svc.SetAuditRepo(auditR)
	svc.SetNotificationRepo(notifR)

	// Create event in repo
	event, err := svc.Create(context.Background(), schedule.CreateScheduleInput{
		Title:      "Rilis Artikel Penting",
		TargetDate: "2026-09-20",
		TargetTime: "11:00",
		EntityType: "knowledge",
		EntityID:   "know-456",
	})
	if err != nil {
		t.Fatalf("failed to create: %v", err)
	}

	published, err := svc.PublishNow(context.Background(), event.ID)
	if err != nil {
		t.Fatalf("PublishNow failed: %v", err)
	}
	if published.Status != "published" {
		t.Fatalf("expected published status, got %s", published.Status)
	}
	if published.ExecutedAt == nil {
		t.Fatalf("expected ExecutedAt to be set")
	}

	// Verify publisher was invoked
	if len(pub.published) != 1 || pub.published[0] != "knowledge:know-456" {
		t.Fatalf("unexpected publisher calls: %v", pub.published)
	}

	// Verify audit was logged
	if len(auditR.events) != 1 || auditR.events[0].Action != "schedule.publish_now" {
		t.Fatalf("unexpected audit events: %v", auditR.events)
	}

	// Verify notification was delivered
	if len(notifR.delivered) != 1 {
		t.Fatalf("expected 1 notification, got %d", len(notifR.delivered))
	}
}

func TestScheduleService_PublishNow_Failure(t *testing.T) {
	repo := newMockRepo()
	pub := &mockPublisher{failType: "news"}
	auditR := &mockAuditRepo{}
	notifR := &mockNotifRepo{}

	svc := schedule.NewService(repo, pub)
	svc.SetAuditRepo(auditR)
	svc.SetNotificationRepo(notifR)

	event, _ := svc.Create(context.Background(), schedule.CreateScheduleInput{
		Title:      "Rilis Berita Gagal",
		TargetDate: "2026-09-22",
		TargetTime: "12:00",
		EntityType: "news",
		EntityID:   "news-999",
	})

	_, err := svc.PublishNow(context.Background(), event.ID)
	if err == nil {
		t.Fatalf("expected error from failed publisher, got nil")
	}

	// Verify schedule was marked failed
	saved, _ := repo.GetByID(context.Background(), event.ID)
	if saved.Status != "failed" {
		t.Fatalf("expected status failed, got %s", saved.Status)
	}
	if saved.FailureReason == nil || *saved.FailureReason != "simulated publication failure" {
		t.Fatalf("expected failure reason, got %v", saved.FailureReason)
	}

	// Verify failure audit and failure notification
	if len(auditR.events) != 1 || auditR.events[0].Action != "schedule.publish_now_failed" {
		t.Fatalf("unexpected audit events: %v", auditR.events)
	}
	if len(notifR.delivered) != 1 {
		t.Fatalf("expected 1 failure notification, got %d", len(notifR.delivered))
	}
}

func TestScheduleService_ExecutePending(t *testing.T) {
	repo := newMockRepo()
	pub := &mockPublisher{}
	auditR := &mockAuditRepo{}
	notifR := &mockNotifRepo{}

	svc := schedule.NewService(repo, pub)
	svc.SetAuditRepo(auditR)
	svc.SetNotificationRepo(notifR)

	past := time.Now().Add(-10 * time.Minute)
	_, _ = repo.Create(context.Background(), schedule.ScheduleEvent{
		ID:         "sched-past-1",
		EntityType: "knowledge",
		EntityID:   "k-1",
		Title:      "Artikel Masa Lalu",
		PublishAt:  past,
		Status:     "scheduled",
	})

	future := time.Now().Add(10 * time.Minute)
	_, _ = repo.Create(context.Background(), schedule.ScheduleEvent{
		ID:         "sched-future-1",
		EntityType: "knowledge",
		EntityID:   "k-2",
		Title:      "Artikel Masa Depan",
		PublishAt:  future,
		Status:     "scheduled",
	})

	count, err := svc.ExecutePending(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("ExecutePending error: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected 1 executed, got %d", count)
	}

	savedPast, _ := repo.GetByID(context.Background(), "sched-past-1")
	if savedPast.Status != "published" {
		t.Fatalf("expected sched-past-1 to be published, got %s", savedPast.Status)
	}

	savedFuture, _ := repo.GetByID(context.Background(), "sched-future-1")
	if savedFuture.Status != "scheduled" {
		t.Fatalf("expected sched-future-1 to remain scheduled, got %s", savedFuture.Status)
	}
}
