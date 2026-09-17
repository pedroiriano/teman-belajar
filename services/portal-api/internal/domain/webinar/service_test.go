package webinar

import (
	"context"
	"errors"
	"testing"
	"time"

	notification "teman-belajar-api/internal/domain/notification"
)

type repoStub struct {
	session Session
	err     error
	calls   int
}

func (r *repoStub) List(context.Context, Filter, string) (Page, error) { return Page{}, r.err }
func (r *repoStub) GetByID(context.Context, int, string) (Session, error) { return r.session, r.err }
func (r *repoStub) Create(context.Context, CreateWebinarInput, string) (Session, error) {
	return r.session, r.err
}
func (r *repoStub) Update(context.Context, int, UpdateWebinarInput, string) (Session, error) {
	return r.session, r.err
}
func (r *repoStub) Delete(context.Context, int, string) error { return r.err }
func (r *repoStub) Register(context.Context, int, Identity, string, string, string) (Session, error) {
	r.calls++
	return r.session, r.err
}
func (r *repoStub) Cancel(context.Context, int, Identity, string) (Session, error) {
	r.calls++
	return r.session, r.err
}
func (r *repoStub) ListAttendees(context.Context, int) ([]Attendee, error) { return nil, r.err }
func (r *repoStub) UpdateAttendance(context.Context, int, string, string) error { return r.err }

type reminderStub struct {
	deliveries []notification.Delivery
	cancelled  []string
	err        error
}

func (r *reminderStub) Deliver(_ context.Context, input notification.Delivery) (notification.DeliveryResult, error) {
	r.deliveries = append(r.deliveries, input)
	return notification.DeliveryResult{Created: true}, r.err
}
func (r *reminderStub) CancelPending(_ context.Context, _ string, _ notification.Audience, eventIDs []string) (int, error) {
	r.cancelled = append(r.cancelled, eventIDs...)
	return len(eventIDs), nil
}

func TestRegisterSchedulesExactlyTwoIdempotentInAppReminders(t *testing.T) {
	now := time.Date(2026, 8, 27, 7, 0, 0, 0, time.UTC)
	repo := &repoStub{session: Session{ID: 41, Title: "Security Live", StartsAt: now.Add(48 * time.Hour)}}
	reminders := &reminderStub{}
	service := NewService(repo, reminders)
	service.now = func() time.Time { return now }

	_, err := service.Register(context.Background(), Identity{Subject: "11111111-1111-4111-8111-111111111111"}, 41, "User Name", "user@example.com", "register:41:one")
	if err != nil {
		t.Fatal(err)
	}
	if len(reminders.deliveries) != 2 {
		t.Fatalf("deliveries=%d", len(reminders.deliveries))
	}
	if reminders.deliveries[0].AvailableAt != repo.session.StartsAt.Add(-24*time.Hour) {
		t.Fatal("T-24 reminder mismatch")
	}
	if reminders.deliveries[1].AvailableAt != repo.session.StartsAt.Add(-time.Hour) {
		t.Fatal("T-1 reminder mismatch")
	}
	for _, delivery := range reminders.deliveries {
		if delivery.EventType != notification.EventLearningReminder || delivery.DeepLink != "/webinars/41" || delivery.Source != "webinar" {
			t.Fatalf("unsafe reminder: %#v", delivery)
		}
	}
}

func TestRegisterRejectsInvalidIdentity(t *testing.T) {
	repo := &repoStub{}
	service := NewService(repo, nil)
	_, err := service.Register(context.Background(), Identity{Subject: ""}, 1, "", "", "key")
	if !errors.Is(err, ErrInvalidInput) || repo.calls != 0 {
		t.Fatalf("err=%v calls=%d", err, repo.calls)
	}
}

func TestProviderFailureDoesNotScheduleReminder(t *testing.T) {
	repo := &repoStub{err: ErrCapacityFull}
	reminders := &reminderStub{}
	service := NewService(repo, reminders)
	_, err := service.Register(context.Background(), Identity{Subject: "subject"}, 1, "", "", "register:one")
	if !errors.Is(err, ErrCapacityFull) || len(reminders.deliveries) != 0 {
		t.Fatalf("err=%v deliveries=%d", err, len(reminders.deliveries))
	}
}

func TestCancelRemovesBothFutureReminders(t *testing.T) {
	repo := &repoStub{session: Session{ID: 41, Registered: false}}
	reminders := &reminderStub{}
	service := NewService(repo, reminders)
	subject := "11111111-1111-4111-8111-111111111111"
	_, err := service.Cancel(context.Background(), Identity{Subject: subject}, 41, "cancel:41:one")
	if err != nil {
		t.Fatal(err)
	}
	if len(reminders.cancelled) != 2 {
		t.Fatalf("cancelled=%#v", reminders.cancelled)
	}
	if reminders.cancelled[0] != reminderEventID(41, subject, "24 jam") || reminders.cancelled[1] != reminderEventID(41, subject, "1 jam") {
		t.Fatalf("unexpected event ids: %#v", reminders.cancelled)
	}
}
