package webinar

import (
	"context"
	"errors"
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
	repo      Repository
	reminders ReminderPort
	now       func() time.Time
}

func NewService(repo Repository, reminders ReminderPort) *Service {
	return &Service{repo: repo, reminders: reminders, now: time.Now}
}

func validIdentity(identity Identity) bool { return strings.TrimSpace(identity.Subject) != "" }

func (s *Service) List(ctx context.Context, identity Identity, page, pageSize int) (Page, error) {
	if page < 1 || pageSize < 1 || pageSize > 50 {
		return Page{}, ErrInvalidInput
	}
	subject := ""
	if validIdentity(identity) {
		subject = identity.Subject
	}
	return s.repo.List(ctx, Filter{Page: page, PageSize: pageSize}, subject)
}

func (s *Service) ListWithFilter(ctx context.Context, identity Identity, filter Filter) (Page, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 50 {
		filter.PageSize = 12
	}
	subject := ""
	if validIdentity(identity) {
		subject = identity.Subject
	}
	return s.repo.List(ctx, filter, subject)
}

func (s *Service) AdminList(ctx context.Context, filter Filter) (Page, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 100 {
		filter.PageSize = 50
	}
	return s.repo.List(ctx, filter, "")
}

func (s *Service) Get(ctx context.Context, identity Identity, id int) (Session, error) {
	if id < 1 {
		return Session{}, ErrInvalidInput
	}
	subject := ""
	if validIdentity(identity) {
		subject = identity.Subject
	}
	return s.repo.GetByID(ctx, id, subject)
}

func (s *Service) AdminGet(ctx context.Context, id int) (Session, error) {
	if id < 1 {
		return Session{}, ErrInvalidInput
	}
	return s.repo.GetByID(ctx, id, "")
}

func (s *Service) Create(ctx context.Context, input CreateWebinarInput, actor string) (Session, error) {
	if strings.TrimSpace(input.Title) == "" || len(input.Title) < 5 {
		return Session{}, errors.New("judul webinar minimal 5 karakter")
	}
	if strings.TrimSpace(input.Speaker) == "" {
		return Session{}, errors.New("nama narasumber wajib diisi")
	}
	if input.StartsAt.IsZero() || input.EndsAt.IsZero() {
		return Session{}, errors.New("waktu mulai dan selesai wajib diisi")
	}
	if !input.StartsAt.Before(input.EndsAt) {
		return Session{}, errors.New("waktu mulai harus lebih awal dari waktu selesai")
	}
	if input.Capacity < 1 {
		return Session{}, errors.New("kapasitas minimal 1 peserta")
	}
	if input.Provider == "" {
		input.Provider = "zoom"
	}
	return s.repo.Create(ctx, input, actor)
}

func (s *Service) Update(ctx context.Context, id int, input UpdateWebinarInput, actor string) (Session, error) {
	if id < 1 {
		return Session{}, ErrInvalidInput
	}
	if input.Title != nil && len(strings.TrimSpace(*input.Title)) < 5 {
		return Session{}, errors.New("judul webinar minimal 5 karakter")
	}
	if input.Capacity != nil && *input.Capacity < 1 {
		return Session{}, errors.New("kapasitas minimal 1 peserta")
	}
	if input.StartsAt != nil && input.EndsAt != nil && !input.StartsAt.Before(*input.EndsAt) {
		return Session{}, errors.New("waktu mulai harus lebih awal dari waktu selesai")
	}
	return s.repo.Update(ctx, id, input, actor)
}

func (s *Service) Delete(ctx context.Context, id int, actor string) error {
	if id < 1 {
		return ErrInvalidInput
	}
	return s.repo.Delete(ctx, id, actor)
}

func (s *Service) Register(ctx context.Context, identity Identity, id int, userName, userEmail, key string) (Session, error) {
	if !validIdentity(identity) || id < 1 || !idempotencyPattern.MatchString(key) {
		return Session{}, ErrInvalidInput
	}
	session, err := s.repo.Register(ctx, id, identity, userName, userEmail, key)
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
			_, _ = s.reminders.Deliver(ctx, notification.Delivery{
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
		}
	}
	return session, nil
}

func (s *Service) Cancel(ctx context.Context, identity Identity, id int, key string) (Session, error) {
	if !validIdentity(identity) || id < 1 || !idempotencyPattern.MatchString(key) {
		return Session{}, ErrInvalidInput
	}
	session, err := s.repo.Cancel(ctx, id, identity, key)
	if err != nil {
		return Session{}, err
	}
	if s.reminders != nil {
		_, _ = s.reminders.CancelPending(ctx, identity.Subject, notification.AudiencePortal, []string{
			reminderEventID(id, identity.Subject, "24 jam"),
			reminderEventID(id, identity.Subject, "1 jam"),
		})
	}
	return session, nil
}

func (s *Service) ListAttendees(ctx context.Context, id int) ([]Attendee, error) {
	if id < 1 {
		return nil, ErrInvalidInput
	}
	return s.repo.ListAttendees(ctx, id)
}

func (s *Service) UpdateAttendance(ctx context.Context, id int, attendeeID string, status string) error {
	if id < 1 || strings.TrimSpace(attendeeID) == "" {
		return ErrInvalidInput
	}
	return s.repo.UpdateAttendance(ctx, id, attendeeID, status)
}

func reminderEventID(id int, subject, label string) string {
	return "webinar:" + strconv.Itoa(id) + ":" + subject + ":t-" + label
}
