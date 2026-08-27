package notification

import (
	"context"
	"net/url"
	"regexp"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/audit"
	domain "teman-belajar-api/internal/domain/notification"
)

const DefaultPageSize = 10

var sourcePattern = regexp.MustCompile(`^[a-z][a-z0-9._-]{1,63}$`)

type Service struct {
	repo          domain.Repository
	auditRepo     audit.Repository
	retentionDays int
	now           func() time.Time
}

func NewService(repo domain.Repository, auditRepo audit.Repository, retentionDays int) *Service {
	if retentionDays < 1 || retentionDays > 365 {
		retentionDays = 90
	}
	return &Service{repo: repo, auditRepo: auditRepo, retentionDays: retentionDays, now: time.Now}
}

func validAudience(value domain.Audience) bool {
	return value == domain.AudiencePortal || value == domain.AudienceAdmin
}
func validSubject(value string) bool { _, err := uuid.Parse(value); return err == nil }
func validEventType(value domain.EventType) bool {
	for _, candidate := range domain.EventTypes {
		if value == candidate {
			return true
		}
	}
	return false
}

func allowedPrefix(audience domain.Audience, path string) bool {
	prefixes := []string{"/", "/my-learning", "/knowledge", "/news", "/announcements", "/help", "/search", "/webinars"}
	if audience == domain.AudienceAdmin {
		prefixes = []string{"/dashboard"}
	}
	for _, prefix := range prefixes {
		if path == prefix || (prefix != "/" && strings.HasPrefix(path, prefix+"/")) {
			return true
		}
	}
	return false
}

func validDeepLink(audience domain.Audience, value string) bool {
	if value == "" || len(value) > 512 || strings.ContainsAny(value, "\\\r\n\t") || strings.HasPrefix(value, "//") {
		return false
	}
	parsed, err := url.Parse(value)
	if err != nil || parsed.IsAbs() || parsed.Host != "" || parsed.Fragment != "" || !strings.HasPrefix(parsed.Path, "/") {
		return false
	}
	return allowedPrefix(audience, parsed.Path)
}

func (s *Service) Deliver(ctx context.Context, input domain.Delivery) (domain.DeliveryResult, error) {
	now := s.now().UTC()
	if input.SchemaVersion != domain.EventSchemaVersion || !sourcePattern.MatchString(input.Source) || !validSubject(input.UserSubject) || !validAudience(input.Audience) || !validEventType(input.EventType) || !validDeepLink(input.Audience, input.DeepLink) || strings.TrimSpace(input.EventID) == "" || len(input.EventID) > 128 || strings.TrimSpace(input.Title) == "" || utf8.RuneCountInString(input.Title) > 160 || strings.TrimSpace(input.Body) == "" || utf8.RuneCountInString(input.Body) > 500 || (input.Priority != domain.PriorityNormal && input.Priority != domain.PriorityHigh) {
		return domain.DeliveryResult{}, domain.ErrInvalidInput
	}
	if input.AvailableAt.IsZero() {
		input.AvailableAt = now
	}
	item := domain.Notification{ID: uuid.NewString(), Audience: input.Audience, EventType: input.EventType, Title: strings.TrimSpace(input.Title), Body: strings.TrimSpace(input.Body), DeepLink: input.DeepLink, Priority: input.Priority, AvailableAt: input.AvailableAt.UTC(), ExpiresAt: input.AvailableAt.UTC().AddDate(0, 0, s.retentionDays), CreatedAt: now}
	result, err := s.repo.Deliver(ctx, input, item)
	if err == nil {
		outcome := "DUPLICATE"
		if result.Created {
			outcome = "CREATED"
		}
		if result.Suppressed {
			outcome = "SUPPRESSED"
		}
		s.audit(ctx, input.UserSubject, "NOTIFICATION_DELIVERED", string(input.Audience)+":"+input.EventID, outcome)
	}
	return result, err
}

// CancelPending removes only future in-app deliveries for one user. It cannot
// retract a reminder that was already made visible to the learner.
func (s *Service) CancelPending(ctx context.Context, subject string, audience domain.Audience, eventIDs []string) (int, error) {
	if !validSubject(subject) || !validAudience(audience) || len(eventIDs) == 0 || len(eventIDs) > 10 {
		return 0, domain.ErrInvalidInput
	}
	for _, eventID := range eventIDs {
		if strings.TrimSpace(eventID) == "" || len(eventID) > 128 {
			return 0, domain.ErrInvalidInput
		}
	}
	count, err := s.repo.CancelPending(ctx, subject, audience, eventIDs, s.now().UTC())
	if err == nil {
		s.audit(ctx, subject, "NOTIFICATION_PENDING_CANCELLED", strings.Join(eventIDs, ","), "SUCCESS")
	}
	return count, err
}

func (s *Service) List(ctx context.Context, subject string, filter domain.ListFilter) (domain.Page, error) {
	if !validSubject(subject) || !validAudience(filter.Audience) || filter.Page < 1 || filter.PageSize < 1 || filter.PageSize > 50 {
		return domain.Page{}, domain.ErrInvalidInput
	}
	filter.Now = s.now().UTC()
	return s.repo.List(ctx, subject, filter)
}

func (s *Service) UnreadCount(ctx context.Context, subject string, audience domain.Audience) (int, error) {
	if !validSubject(subject) || !validAudience(audience) {
		return 0, domain.ErrInvalidInput
	}
	return s.repo.UnreadCount(ctx, subject, audience)
}

func (s *Service) MarkRead(ctx context.Context, subject string, audience domain.Audience, id string) (*domain.Notification, error) {
	if !validSubject(subject) || !validAudience(audience) || !validSubject(id) {
		return nil, domain.ErrInvalidInput
	}
	item, err := s.repo.MarkRead(ctx, subject, audience, id)
	if err == nil {
		s.audit(ctx, subject, "NOTIFICATION_READ", id, "SUCCESS")
	}
	return item, err
}

func (s *Service) MarkAllRead(ctx context.Context, subject string, audience domain.Audience) (int, error) {
	if !validSubject(subject) || !validAudience(audience) {
		return 0, domain.ErrInvalidInput
	}
	count, err := s.repo.MarkAllRead(ctx, subject, audience)
	if err == nil {
		s.audit(ctx, subject, "NOTIFICATION_READ_ALL", string(audience), "SUCCESS")
	}
	return count, err
}

func (s *Service) Preferences(ctx context.Context, subject string, audience domain.Audience) ([]domain.Preference, error) {
	if !validSubject(subject) || !validAudience(audience) {
		return nil, domain.ErrInvalidInput
	}
	existing, err := s.repo.ListPreferences(ctx, subject, audience)
	if err != nil {
		return nil, err
	}
	byType := make(map[domain.EventType]domain.Preference, len(existing))
	for _, preference := range existing {
		byType[preference.EventType] = preference
	}
	result := make([]domain.Preference, 0, len(domain.EventTypes))
	for _, eventType := range domain.EventTypes {
		if preference, ok := byType[eventType]; ok {
			result = append(result, preference)
		} else {
			result = append(result, domain.Preference{Audience: audience, EventType: eventType, Enabled: true})
		}
	}
	return result, nil
}

func (s *Service) SetPreference(ctx context.Context, subject string, audience domain.Audience, eventType domain.EventType, enabled bool) (domain.Preference, error) {
	if !validSubject(subject) || !validAudience(audience) || !validEventType(eventType) {
		return domain.Preference{}, domain.ErrInvalidInput
	}
	preference, err := s.repo.SetPreference(ctx, subject, audience, eventType, enabled)
	if err == nil {
		s.audit(ctx, subject, "NOTIFICATION_PREFERENCE_UPDATED", string(audience)+":"+string(eventType), "SUCCESS")
	}
	return preference, err
}

func (s *Service) audit(ctx context.Context, subject, action, target, result string) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: subject, Action: action, TargetType: "notification", TargetID: target, Result: result, OccurredAt: s.now().UTC()})
}
