package webinar

import (
	"context"
	"regexp"
	"strconv"
	"strings"
	"time"

	notification "teman-belajar-api/internal/domain/notification"
)

var idempotencyPattern = regexp.MustCompile(`^[A-Za-z0-9._:-]{8,64}$`)

type ReminderPort interface {
	Deliver(context.Context, notification.Delivery) (notification.DeliveryResult, error)
	CancelPending(context.Context, string, notification.Audience, []string) (int, error)
}

type Service struct {
	provider  ProviderPort
	reminders ReminderPort
	now       func() time.Time
}

func NewService(provider ProviderPort, reminders ReminderPort) *Service {
	return &Service{provider: provider, reminders: reminders, now: time.Now}
}

func validIdentity(identity Identity) bool { return strings.TrimSpace(identity.Subject) != "" }

func (s *Service) List(ctx context.Context, identity Identity, page, pageSize int) (Page, error) {
	if !validIdentity(identity) || page < 1 || pageSize < 1 || pageSize > 50 {
		return Page{}, ErrInvalidInput
	}
	return s.provider.List(ctx, identity, page, pageSize)
}

func (s *Service) Get(ctx context.Context, identity Identity, id int) (Session, error) {
	if !validIdentity(identity) || id < 1 {
		return Session{}, ErrInvalidInput
	}
	return s.provider.Get(ctx, identity, id)
}

func (s *Service) Register(ctx context.Context, identity Identity, id int, key string) (Session, error) {
	if !validIdentity(identity) || id < 1 || !idempotencyPattern.MatchString(key) {
		return Session{}, ErrInvalidInput
	}
	session, err := s.provider.Register(ctx, identity, id, key)
	if err != nil {
		return Session{}, err
	}
	if s.reminders != nil {
		for _, offset := range []time.Duration{24 * time.Hour, time.Hour} {
			available := session.StartsAt.Add(-offset)
			if !available.After(s.now().UTC()) {
				continue
			}
			label := "24 jam"
			if offset == time.Hour {
				label = "1 jam"
			}
			_, err = s.reminders.Deliver(ctx, notification.Delivery{
				EventID:       reminderEventID(session.ID, identity.Subject, label),
				SchemaVersion: notification.EventSchemaVersion,
				Source:        "webinar",
				UserSubject:   identity.Subject,
				Audience:      notification.AudiencePortal,
				EventType:     notification.EventLearningReminder,
				Title:         "Webinar akan dimulai",
				Body:          session.Title + " dimulai dalam " + label + ".",
				DeepLink:      "/webinars/" + strconv.Itoa(session.ID),
				Priority:      notification.PriorityNormal,
				AvailableAt:   available,
			})
			if err != nil {
				return Session{}, ErrUnavailable
			}
		}
	}
	return session, nil
}

func (s *Service) Cancel(ctx context.Context, identity Identity, id int, key string) (Session, error) {
	if !validIdentity(identity) || id < 1 || !idempotencyPattern.MatchString(key) {
		return Session{}, ErrInvalidInput
	}
	session, err := s.provider.Cancel(ctx, identity, id, key)
	if err != nil {
		return Session{}, err
	}
	if s.reminders != nil {
		_, err = s.reminders.CancelPending(ctx, identity.Subject, notification.AudiencePortal, []string{
			reminderEventID(id, identity.Subject, "24 jam"),
			reminderEventID(id, identity.Subject, "1 jam"),
		})
		if err != nil {
			return Session{}, ErrUnavailable
		}
	}
	return session, nil
}

func reminderEventID(id int, subject, label string) string {
	return "webinar:" + strconv.Itoa(id) + ":" + subject + ":t-" + label
}
