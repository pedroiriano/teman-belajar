package coursereview

import (
	"context"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) GetPublicReviews(ctx context.Context, slug string, filter ListFilter) (*ListResult, error) {
	if strings.TrimSpace(slug) == "" {
		return nil, ErrProgramNotFound
	}
	if _, err := s.repo.GetProgramIDBySlug(ctx, slug); err != nil {
		return nil, ErrProgramNotFound
	}
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 50 {
		filter.PageSize = 10
	}

	summary, err := s.repo.GetSummaryBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if summary == nil {
		summary = &RatingSummary{
			AverageRating: 0,
			TotalReviews:  0,
			Distribution:  defaultDistribution(),
		}
	}

	reviews, total, err := s.repo.ListPublicBySlug(ctx, slug, filter)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.PageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &ListResult{
		Summary: *summary,
		Reviews: reviews,
		Pagination: Pagination{
			Page:       filter.Page,
			PageSize:   filter.PageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *Service) GetMyReview(ctx context.Context, userSubject, slug string) (*Review, error) {
	if strings.TrimSpace(userSubject) == "" || strings.TrimSpace(slug) == "" {
		return nil, ErrNotFound
	}
	return s.repo.GetByUserAndSlug(ctx, userSubject, slug)
}

func (s *Service) SubmitReview(ctx context.Context, userSubject, authorName, slug string, input ReviewInput) (*Review, error) {
	if strings.TrimSpace(userSubject) == "" {
		return nil, ErrUnauthorized
	}
	if strings.TrimSpace(slug) == "" {
		return nil, ErrProgramNotFound
	}
	if err := input.Validate(); err != nil {
		return nil, err
	}

	programID, err := s.repo.GetProgramIDBySlug(ctx, slug)
	if err != nil {
		return nil, ErrProgramNotFound
	}

	displayName := strings.TrimSpace(authorName)
	if displayName == "" {
		displayName = "Pembelajar Teman Belajar"
	}

	existing, _ := s.repo.GetByUserAndSlug(ctx, userSubject, slug)
	reviewID := uuid.New().String()
	now := time.Now().UTC()
	createdAt := now

	if existing != nil {
		reviewID = existing.ID
		createdAt = existing.CreatedAt
	}

	review := &Review{
		ID:          reviewID,
		ProgramID:   programID,
		ProgramSlug: slug,
		UserSubject: userSubject,
		AuthorName:  displayName,
		Rating:      input.Rating,
		Title:       input.Title,
		Content:     input.Content,
		Status:      StatusPublished,
		CreatedAt:   createdAt,
		UpdatedAt:   now,
	}

	if err := s.repo.Upsert(ctx, review); err != nil {
		return nil, err
	}

	return review, nil
}

func (s *Service) DeleteMyReview(ctx context.Context, userSubject, slug string) error {
	if strings.TrimSpace(userSubject) == "" || strings.TrimSpace(slug) == "" {
		return ErrNotFound
	}
	return s.repo.DeleteByUserAndSlug(ctx, userSubject, slug)
}

func (s *Service) ListAdminReviews(ctx context.Context, filter AdminFilter) (*AdminListResult, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 || filter.PageSize > 100 {
		filter.PageSize = 20
	}

	reviews, total, err := s.repo.ListAdmin(ctx, filter)
	if err != nil {
		return nil, err
	}

	totalPages := int(math.Ceil(float64(total) / float64(filter.PageSize)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &AdminListResult{
		Reviews: reviews,
		Pagination: Pagination{
			Page:       filter.Page,
			PageSize:   filter.PageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *Service) UpdateReviewStatus(ctx context.Context, id string, status Status) error {
	switch status {
	case StatusPublished, StatusHidden, StatusFlagged:
		// valid
	default:
		return ErrInvalidStatus
	}

	review, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ErrNotFound
	}
	if review == nil {
		return ErrNotFound
	}

	return s.repo.UpdateStatus(ctx, id, status)
}

func defaultDistribution() map[int]StarDistribution {
	dist := make(map[int]StarDistribution, 5)
	for i := 1; i <= 5; i++ {
		dist[i] = StarDistribution{Count: 0, Percentage: 0}
	}
	return dist
}
