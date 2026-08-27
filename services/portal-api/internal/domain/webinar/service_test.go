package webinar

import (
	"context"
	"errors"
	"testing"
	"time"

	notification "teman-belajar-api/internal/domain/notification"
)

type providerStub struct {
	session Session
	err     error
	calls   int
}

func (p *providerStub) List(context.Context, Identity, int, int) (Page, error) { return Page{}, p.err }
func (p *providerStub) Get(context.Context, Identity, int) (Session, error)    { return p.session, p.err }
func (p *providerStub) Register(context.Context, Identity, int, string) (Session, error) {
	p.calls++
	return p.session, p.err
}
func (p *providerStub) Cancel(context.Context, Identity, int, string) (Session, error) {
	p.calls++
	return p.session, p.err
}

type reminderStub struct {
	deliveries []notification.Delivery
	cancelled  []string
	err        error
}

func (r *reminderStub) Deliver(_ context.Context, input notification.Delivery) (notification.DeliveryResult, error) {
	r.deliveries = append(r.deliveries, input)
	return notification.DeliveryResult{Created: true}, r.err
}

func TestReminderFailureReturnsRetryableUnavailableAfterIdempotentRegistration(t *testing.T) {
	now := time.Date(2026, 8, 27, 7, 0, 0, 0, time.UTC)
	provider := &providerStub{session: Session{ID: 41, Title: "Live", StartsAt: now.Add(48 * time.Hour)}}
	service := NewService(provider, &reminderStub{err: errors.New("notification store unavailable")})
	service.now = func() time.Time { return now }
	_, err := service.Register(context.Background(), Identity{Subject: "11111111-1111-4111-8111-111111111111"}, 41, "register:retry:01")
	if !errors.Is(err, ErrUnavailable) || provider.calls != 1 {
		t.Fatalf("err=%v calls=%d", err, provider.calls)
	}
}
func (r *reminderStub) CancelPending(_ context.Context, _ string, _ notification.Audience, eventIDs []string) (int, error) {
	r.cancelled = append(r.cancelled, eventIDs...)
	return len(eventIDs), nil
}

func TestRegisterSchedulesExactlyTwoIdempotentInAppReminders(t *testing.T) {
	now := time.Date(2026, 8, 27, 7, 0, 0, 0, time.UTC)
	provider := &providerStub{session: Session{ID: 41, Title: "Security Live", StartsAt: now.Add(48 * time.Hour)}}
	reminders := &reminderStub{}
	service := NewService(provider, reminders)
	service.now = func() time.Time { return now }

	_, err := service.Register(context.Background(), Identity{Subject: "11111111-1111-4111-8111-111111111111"}, 41, "register:41:one")
	if err != nil {
		t.Fatal(err)
	}
	if len(reminders.deliveries) != 2 {
		t.Fatalf("deliveries=%d", len(reminders.deliveries))
	}
	if reminders.deliveries[0].AvailableAt != provider.session.StartsAt.Add(-24*time.Hour) {
		t.Fatal("T-24 reminder mismatch")
	}
	if reminders.deliveries[1].AvailableAt != provider.session.StartsAt.Add(-time.Hour) {
		t.Fatal("T-1 reminder mismatch")
	}
	for _, delivery := range reminders.deliveries {
		if delivery.EventType != notification.EventLearningReminder || delivery.DeepLink != "/webinars/41" || delivery.Source != "webinar" {
			t.Fatalf("unsafe reminder: %#v", delivery)
		}
	}
}

func TestRegisterRejectsInvalidIdempotencyBeforeProvider(t *testing.T) {
	provider := &providerStub{}
	service := NewService(provider, nil)
	_, err := service.Register(context.Background(), Identity{Subject: "subject"}, 1, "short")
	if !errors.Is(err, ErrInvalidInput) || provider.calls != 0 {
		t.Fatalf("err=%v calls=%d", err, provider.calls)
	}
}

func TestProviderFailureDoesNotScheduleReminder(t *testing.T) {
	provider := &providerStub{err: ErrCapacityFull}
	reminders := &reminderStub{}
	service := NewService(provider, reminders)
	_, err := service.Register(context.Background(), Identity{Subject: "subject"}, 1, "register:one")
	if !errors.Is(err, ErrCapacityFull) || len(reminders.deliveries) != 0 {
		t.Fatalf("err=%v deliveries=%d", err, len(reminders.deliveries))
	}
}

func TestCancelRemovesBothFutureReminders(t *testing.T) {
	provider := &providerStub{session: Session{ID: 41, Registered: false}}
	reminders := &reminderStub{}
	service := NewService(provider, reminders)
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
