package notification

import (
	"context"
	"errors"
	"testing"
	"time"

	domain "teman-belajar-api/internal/domain/notification"
)

const (
	subjectA = "11111111-1111-4111-8111-111111111111"
	subjectB = "22222222-2222-4222-8222-222222222222"
)

type repositoryStub struct {
	deliveries  map[string]domain.Notification
	preferences map[domain.EventType]bool
}

func newRepositoryStub() *repositoryStub {
	return &repositoryStub{deliveries: map[string]domain.Notification{}, preferences: map[domain.EventType]bool{}}
}

func (r *repositoryStub) Deliver(_ context.Context, input domain.Delivery, item domain.Notification) (domain.DeliveryResult, error) {
	if enabled, found := r.preferences[input.EventType]; found && !enabled {
		return domain.DeliveryResult{Suppressed: true}, nil
	}
	key := input.UserSubject + ":" + string(input.Audience) + ":" + input.EventID
	if existing, found := r.deliveries[key]; found {
		return domain.DeliveryResult{Notification: &existing}, nil
	}
	r.deliveries[key] = item
	return domain.DeliveryResult{Notification: &item, Created: true}, nil
}
func (r *repositoryStub) CancelPending(_ context.Context, subject string, audience domain.Audience, eventIDs []string, _ time.Time) (int, error) {
	count := 0
	for _, eventID := range eventIDs {
		key := subject + ":" + string(audience) + ":" + eventID
		if _, found := r.deliveries[key]; found {
			delete(r.deliveries, key)
			count++
		}
	}
	return count, nil
}
func (r *repositoryStub) List(context.Context, string, domain.ListFilter) (domain.Page, error) {
	return domain.Page{}, nil
}
func (r *repositoryStub) UnreadCount(context.Context, string, domain.Audience) (int, error) {
	return 0, nil
}
func (r *repositoryStub) MarkRead(_ context.Context, subject string, _ domain.Audience, _ string) (*domain.Notification, error) {
	if subject == subjectB {
		return nil, domain.ErrNotFound
	}
	return &domain.Notification{}, nil
}
func (r *repositoryStub) MarkAllRead(context.Context, string, domain.Audience) (int, error) {
	return 1, nil
}
func (r *repositoryStub) ListPreferences(_ context.Context, _ string, audience domain.Audience) ([]domain.Preference, error) {
	items := make([]domain.Preference, 0, len(r.preferences))
	for eventType, enabled := range r.preferences {
		items = append(items, domain.Preference{Audience: audience, EventType: eventType, Enabled: enabled})
	}
	return items, nil
}
func (r *repositoryStub) SetPreference(_ context.Context, _ string, audience domain.Audience, eventType domain.EventType, enabled bool) (domain.Preference, error) {
	r.preferences[eventType] = enabled
	return domain.Preference{Audience: audience, EventType: eventType, Enabled: enabled}, nil
}

func validDelivery() domain.Delivery {
	return domain.Delivery{EventID: "course-42:updated:7", SchemaVersion: domain.EventSchemaVersion, Source: "learning.adapter", UserSubject: subjectA, Audience: domain.AudiencePortal, EventType: domain.EventLearningCourseUpdated, Title: "Kursus diperbarui", Body: "Materi baru tersedia.", DeepLink: "/my-learning/course-42", Priority: domain.PriorityNormal}
}

func TestDeliverIsIdempotentAndUsesBoundedRetention(t *testing.T) {
	repo := newRepositoryStub()
	service := NewService(repo, nil, 90)
	now := time.Date(2026, time.August, 26, 1, 2, 3, 0, time.UTC)
	service.now = func() time.Time { return now }

	first, err := service.Deliver(context.Background(), validDelivery())
	if err != nil || !first.Created {
		t.Fatalf("first delivery: %#v err=%v", first, err)
	}
	second, err := service.Deliver(context.Background(), validDelivery())
	if err != nil || second.Created || second.Notification == nil || second.Notification.ID != first.Notification.ID {
		t.Fatalf("duplicate delivery: %#v err=%v", second, err)
	}
	if got := first.Notification.ExpiresAt.Sub(first.Notification.AvailableAt); got != 90*24*time.Hour {
		t.Fatalf("retention=%v", got)
	}
}

func TestDeliverHonorsPreferenceAndRejectsUnsafeDeepLinks(t *testing.T) {
	repo := newRepositoryStub()
	repo.preferences[domain.EventLearningCourseUpdated] = false
	service := NewService(repo, nil, 90)
	result, err := service.Deliver(context.Background(), validDelivery())
	if err != nil || !result.Suppressed {
		t.Fatalf("preference suppression: %#v err=%v", result, err)
	}

	for _, link := range []string{"https://evil.example", "//evil.example", "javascript:alert(1)", "/dashboard/users", "/my-learning#token"} {
		input := validDelivery()
		input.EventID += link
		input.DeepLink = link
		if _, err := service.Deliver(context.Background(), input); !errors.Is(err, domain.ErrInvalidInput) {
			t.Fatalf("unsafe link %q accepted: %v", link, err)
		}
	}
}

func TestUserPartitionIsPassedToRepository(t *testing.T) {
	service := NewService(newRepositoryStub(), nil, 90)
	if _, err := service.MarkRead(context.Background(), subjectB, domain.AudiencePortal, "33333333-3333-4333-8333-333333333333"); !errors.Is(err, domain.ErrNotFound) {
		t.Fatalf("cross-user result=%v", err)
	}
}

func TestPreferencesExposeSafeDefaults(t *testing.T) {
	items, err := NewService(newRepositoryStub(), nil, 90).Preferences(context.Background(), subjectA, domain.AudiencePortal)
	if err != nil || len(items) != len(domain.EventTypes) {
		t.Fatalf("preferences=%#v err=%v", items, err)
	}
	for _, item := range items {
		if !item.Enabled {
			t.Fatalf("default preference disabled: %#v", item)
		}
	}
}

func TestCancelPendingUsesUserPartitionAndRejectsEmptyEventSet(t *testing.T) {
	repo := newRepositoryStub()
	service := NewService(repo, nil, 90)
	delivery := validDelivery()
	delivery.EventID = "webinar:41:" + subjectA + ":t-24 jam"
	delivery.AvailableAt = time.Now().UTC().Add(time.Hour)
	if _, err := service.Deliver(context.Background(), delivery); err != nil {
		t.Fatal(err)
	}
	count, err := service.CancelPending(context.Background(), subjectA, domain.AudiencePortal, []string{delivery.EventID})
	if err != nil || count != 1 {
		t.Fatalf("count=%d err=%v", count, err)
	}
	if _, err := service.CancelPending(context.Background(), subjectA, domain.AudiencePortal, nil); !errors.Is(err, domain.ErrInvalidInput) {
		t.Fatalf("empty event set err=%v", err)
	}
}
