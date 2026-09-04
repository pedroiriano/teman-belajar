package dashboard

import (
	"context"
	"time"
)

const defaultReviewLimit = 25

// Service orchestrates the dashboard summary retrieval.
type Service struct {
	repo Repository
}

// NewService creates a new dashboard Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// GetSummary returns the aggregated admin dashboard summary.
func (s *Service) GetSummary(ctx context.Context) (*Summary, error) {
	summary, err := s.repo.GetSummary(ctx, defaultReviewLimit)
	if err != nil {
		return nil, err
	}
	summary.GeneratedAt = time.Now().UTC()
	return summary, nil
}

// GetWorkflowItems returns editorial workflow items matching the filter.
func (s *Service) GetWorkflowItems(ctx context.Context, filter WorkflowFilter) ([]WorkflowItem, error) {
	if filter.Limit <= 0 || filter.Limit > 500 {
		filter.Limit = 150
	}
	return s.repo.GetWorkflowItems(ctx, filter)
}

