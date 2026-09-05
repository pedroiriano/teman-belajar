package reviewnote

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
)

var ErrInvalidInput = errors.New("invalid review note input")

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func normalizeEntityType(t string) string {
	t = strings.ToLower(strings.TrimSpace(t))
	switch t {
	case "announcements", "announcement":
		return "announcements"
	case "faqs", "faq":
		return "faqs"
	case "training", "training_programs", "training-programs":
		return "training"
	case "microlearning", "microlearnings":
		return "microlearning"
	case "learning_paths", "learning-paths", "learning_path":
		return "learning_paths"
	default:
		return t
	}
}

func (s *Service) ListByEntity(ctx context.Context, entityType string, entityID string, limit int) ([]ReviewNote, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.repo.ListByEntity(ctx, normalizeEntityType(entityType), strings.TrimSpace(entityID), limit)
}

func (s *Service) Create(ctx context.Context, input CreateReviewNoteInput) (*ReviewNote, error) {
	notes := strings.TrimSpace(input.Notes)
	if notes == "" {
		return nil, fmt.Errorf("%w: notes cannot be empty", ErrInvalidInput)
	}
	entityType := normalizeEntityType(input.EntityType)
	if entityType == "" {
		return nil, fmt.Errorf("%w: entity_type is required", ErrInvalidInput)
	}
	entityID := strings.TrimSpace(input.EntityID)
	if entityID == "" {
		return nil, fmt.Errorf("%w: entity_id is required", ErrInvalidInput)
	}

	action := strings.ToLower(strings.TrimSpace(input.Action))
	if action == "" {
		action = "request_changes"
	}

	reviewerName := strings.TrimSpace(input.ReviewerName)
	if reviewerName == "" {
		reviewerName = "Reviewer"
	}

	note := ReviewNote{
		EntityType:   entityType,
		EntityID:     entityID,
		Action:       action,
		Notes:        notes,
		ReviewerID:   input.ReviewerID,
		ReviewerName: reviewerName,
		CreatedAt:    time.Now(),
	}

	return s.repo.Create(ctx, note)
}
