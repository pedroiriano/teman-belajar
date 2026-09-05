package recommendationpin

import (
	"context"
	"fmt"
	"strings"
	"time"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) List(ctx context.Context, targetType string, limit int) ([]RecommendationPin, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.repo.List(ctx, strings.ToLower(strings.TrimSpace(targetType)), limit)
}

func (s *Service) Create(ctx context.Context, input CreatePinInput, actor string) (*RecommendationPin, error) {
	targetType := strings.ToLower(strings.TrimSpace(input.TargetType))
	if targetType == "" {
		return nil, fmt.Errorf("%w: target_type is required", ErrInvalidInput)
	}
	targetID := strings.TrimSpace(input.TargetID)
	if targetID == "" {
		return nil, fmt.Errorf("%w: target_id is required", ErrInvalidInput)
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, fmt.Errorf("%w: title is required", ErrInvalidInput)
	}

	weight := input.Weight
	if weight <= 0 {
		weight = 100
	}
	if weight > 1000 {
		weight = 1000
	}

	pin := RecommendationPin{
		TargetType: targetType,
		TargetID:   targetID,
		Title:      title,
		Pinned:     true,
		Weight:     weight,
		PinnedBy:   actor,
		CreatedAt:  time.Now().UTC(),
		UpdatedAt:  time.Now().UTC(),
	}

	return s.repo.Create(ctx, pin)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: id is required", ErrInvalidInput)
	}
	return s.repo.Delete(ctx, id)
}
