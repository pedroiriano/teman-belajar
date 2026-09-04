package schedule

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

var (
	ErrInvalidInput = errors.New("invalid schedule input")
	ErrNotFound     = errors.New("schedule not found")
)

// EntityPublisher defines the interface to publish an underlying entity when schedule triggers.
type EntityPublisher interface {
	PublishEntity(ctx context.Context, entityType string, entityID string) error
}

type Service struct {
	repo      Repository
	publisher EntityPublisher
	loc       *time.Location
}

func NewService(repo Repository, publisher EntityPublisher) *Service {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	return &Service{
		repo:      repo,
		publisher: publisher,
		loc:       loc,
	}
}

// Module mapping helpers
func normalizeEntityType(raw string) string {
	lower := strings.ToLower(strings.TrimSpace(raw))
	switch lower {
	case "pelatihan", "training", "training_programs", "training-programs":
		return "training_programs"
	case "pengetahuan", "knowledge", "knowledge_articles":
		return "knowledge"
	case "berita", "news":
		return "news"
	case "pengumuman", "announcement", "announcements":
		return "announcements"
	case "microlearning":
		return "microlearning"
	case "jalur belajar", "learning_paths", "learning-paths":
		return "learning_paths"
	case "faq", "faqs":
		return "faqs"
	default:
		return lower
	}
}

func entityTypeToModuleLabel(entityType string) string {
	switch entityType {
	case "training_programs":
		return "Pelatihan"
	case "knowledge":
		return "Pengetahuan"
	case "news":
		return "Berita"
	case "announcements":
		return "Pengumuman"
	case "microlearning":
		return "Microlearning"
	case "learning_paths":
		return "Jalur Belajar"
	case "faqs":
		return "FAQ"
	default:
		return strings.Title(entityType)
	}
}

func statusToLabel(status string) string {
	switch status {
	case "scheduled":
		return "Terjadwal"
	case "published":
		return "Terbit"
	case "cancelled":
		return "Dibatalkan"
	case "failed":
		return "Gagal"
	default:
		return status
	}
}

func (s *Service) List(ctx context.Context, month string, moduleFilter string) (*ListResult, error) {
	entityFilter := ""
	if moduleFilter != "" && moduleFilter != "all" {
		entityFilter = normalizeEntityType(moduleFilter)
	}

	events, err := s.repo.List(ctx, month, entityFilter)
	if err != nil {
		return nil, fmt.Errorf("list schedules: %w", err)
	}

	// Slot conflict tracking
	slotMap := make(map[string][]string)
	for _, ev := range events {
		slotKey := fmt.Sprintf("%s_%s", ev.TargetDate, ev.TargetTime)
		slotMap[slotKey] = append(slotMap[slotKey], ev.ID)
	}

	conflictCount := 0
	enriched := make([]ScheduleEvent, len(events))
	for i, ev := range events {
		slotKey := fmt.Sprintf("%s_%s", ev.TargetDate, ev.TargetTime)
		slotIDs := slotMap[slotKey]
		hasConflict := len(slotIDs) > 1

		if hasConflict {
			conflictCount++
			details := fmt.Sprintf("Konflik jadwal: slot %s pukul %s WIB digunakan lebih dari satu publikasi.", ev.TargetDate, ev.TargetTime)
			ev.ConflictDetails = &details
		}

		ev.HasConflict = hasConflict
		ev.Module = entityTypeToModuleLabel(ev.EntityType)
		ev.StatusLabel = statusToLabel(ev.Status)
		enriched[i] = ev
	}

	return &ListResult{
		Events:        enriched,
		ConflictCount: conflictCount,
	}, nil
}

func (s *Service) Create(ctx context.Context, input CreateScheduleInput) (*ScheduleEvent, error) {
	title := strings.TrimSpace(input.Title)
	if len(title) < 3 {
		return nil, fmt.Errorf("%w: title must be at least 3 characters", ErrInvalidInput)
	}
	if input.TargetDate == "" {
		return nil, fmt.Errorf("%w: target_date is required", ErrInvalidInput)
	}
	if input.TargetTime == "" {
		return nil, fmt.Errorf("%w: target_time is required", ErrInvalidInput)
	}

	entityType := normalizeEntityType(input.EntityType)
	if entityType == "" {
		entityType = normalizeEntityType(input.Module)
	}
	if entityType == "" {
		entityType = "knowledge"
	}

	entityID := strings.TrimSpace(input.EntityID)
	if entityID == "" {
		entityID = fmt.Sprintf("auto-%d", time.Now().UnixNano())
	}

	// Parse date and time in WIB
	dateTimeStr := fmt.Sprintf("%s %s:00", input.TargetDate, input.TargetTime)
	publishAt, err := time.ParseInLocation("2006-01-02 15:04:05", dateTimeStr, s.loc)
	if err != nil {
		return nil, fmt.Errorf("%w: invalid target date/time format: %v", ErrInvalidInput, err)
	}

	owner := strings.TrimSpace(input.Owner)
	if owner == "" {
		owner = "Administrator"
	}

	event := ScheduleEvent{
		EntityType:        entityType,
		EntityID:          entityID,
		Title:             title,
		TargetDate:        input.TargetDate,
		TargetTime:        input.TargetTime,
		PublishAt:         publishAt,
		Status:            "scheduled",
		Owner:             owner,
		CohortLabel:       input.CohortLabel,
		ParticipantsCount: input.ParticipantsCount,
		Description:       input.Description,
		CreatedAt:         time.Now(),
		UpdatedAt:         time.Now(),
	}

	created, err := s.repo.Create(ctx, event)
	if err != nil {
		return nil, fmt.Errorf("create schedule: %w", err)
	}

	created.Module = entityTypeToModuleLabel(created.EntityType)
	created.StatusLabel = statusToLabel(created.Status)
	return created, nil
}

func (s *Service) Cancel(ctx context.Context, id string) error {
	return s.repo.Cancel(ctx, id)
}

func (s *Service) ExecutePending(ctx context.Context, cutoff time.Time) (int, error) {
	pending, err := s.repo.GetPendingExecution(ctx, cutoff, 50)
	if err != nil {
		return 0, fmt.Errorf("fetch pending schedules: %w", err)
	}

	executedCount := 0
	for _, item := range pending {
		var pubErr error
		if s.publisher != nil {
			pubErr = s.publisher.PublishEntity(ctx, item.EntityType, item.EntityID)
		}

		if pubErr != nil {
			_ = s.repo.MarkFailed(ctx, item.ID, pubErr.Error())
		} else {
			if err := s.repo.MarkExecuted(ctx, item.ID, time.Now()); err == nil {
				executedCount++
			}
		}
	}

	return executedCount, nil
}
