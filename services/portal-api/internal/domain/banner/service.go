package banner

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

type Service struct {
	repo      Repository
	auditRepo audit.Repository
	now       func() time.Time
}

func NewService(repo Repository, auditRepo audit.Repository) *Service {
	return &Service{
		repo:      repo,
		auditRepo: auditRepo,
		now:       func() time.Time { return time.Now().UTC() },
	}
}

func (s *Service) audit(ctx context.Context, actor, action, targetType, targetID string) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
		ID:          uuid.NewString(),
		ActorUserID: actor,
		Action:      action,
		Module:      "banner",
		TargetType:  targetType,
		TargetID:    targetID,
		Result:      "SUCCESS",
		OccurredAt:  s.now(),
	})
}

func cleanText(val string) string {
	return strings.TrimSpace(val)
}

func validateInput(title, description, imageURL, align string) error {
	if title == "" || len(title) > 255 {
		return ErrValidation
	}
	if description == "" || len(description) > 1000 {
		return ErrValidation
	}
	if imageURL == "" || len(imageURL) > 1024 {
		return ErrValidation
	}
	if align != "left" && align != "center" && align != "right" {
		return ErrValidation
	}
	return nil
}

func (s *Service) ListActive(ctx context.Context) ([]Banner, error) {
	banners, err := s.repo.ListActive(ctx)
	if err != nil {
		return nil, err
	}
	if banners == nil {
		banners = []Banner{}
	}
	return banners, nil
}

func (s *Service) ListAll(ctx context.Context, page, pageSize int, search, statusFilter string) ([]Banner, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}
	return s.repo.ListAll(ctx, page, pageSize, search, statusFilter)
}

func (s *Service) GetByID(ctx context.Context, id string) (*Banner, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Create(ctx context.Context, in CreateBannerInput, actor string) (*Banner, error) {
	in.Title = cleanText(in.Title)
	in.Description = cleanText(in.Description)
	in.ImageURL = cleanText(in.ImageURL)
	in.CTALabel = cleanText(in.CTALabel)
	in.CTAHref = cleanText(in.CTAHref)
	in.Align = strings.ToLower(cleanText(in.Align))
	if in.Align == "" {
		in.Align = "left"
	}
	if in.SortOrder < 1 {
		in.SortOrder = 1
	}

	if err := validateInput(in.Title, in.Description, in.ImageURL, in.Align); err != nil {
		return nil, err
	}

	if in.IsActive {
		activeCount, err := s.repo.CountActive(ctx)
		if err != nil {
			return nil, err
		}
		if activeCount >= 3 {
			return nil, ErrMaxActiveBanners
		}
	}

	now := s.now()
	item := &Banner{
		ID:          uuid.NewString(),
		Title:       in.Title,
		Description: in.Description,
		ImageURL:    in.ImageURL,
		CTALabel:    in.CTALabel,
		CTAHref:     in.CTAHref,
		Align:       in.Align,
		SortOrder:   in.SortOrder,
		IsActive:    in.IsActive,
		CreatedAt:   now,
		UpdatedAt:   now,
		CreatedBy:   actor,
		UpdatedBy:   actor,
	}

	if err := s.repo.Create(ctx, item); err != nil {
		return nil, err
	}

	s.audit(ctx, actor, "BANNER_CREATED", "banner", item.ID)
	return item, nil
}

func (s *Service) Update(ctx context.Context, id string, in UpdateBannerInput, actor string) (*Banner, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrNotFound
	}

	in.Title = cleanText(in.Title)
	in.Description = cleanText(in.Description)
	in.ImageURL = cleanText(in.ImageURL)
	in.CTALabel = cleanText(in.CTALabel)
	in.CTAHref = cleanText(in.CTAHref)
	in.Align = strings.ToLower(cleanText(in.Align))
	if in.Align == "" {
		in.Align = "left"
	}
	if in.SortOrder < 1 {
		in.SortOrder = 1
	}

	if err := validateInput(in.Title, in.Description, in.ImageURL, in.Align); err != nil {
		return nil, err
	}

	if !existing.IsActive && in.IsActive {
		activeCount, err := s.repo.CountActive(ctx)
		if err != nil {
			return nil, err
		}
		if activeCount >= 3 {
			return nil, ErrMaxActiveBanners
		}
	}

	now := s.now()
	existing.Title = in.Title
	existing.Description = in.Description
	existing.ImageURL = in.ImageURL
	existing.CTALabel = in.CTALabel
	existing.CTAHref = in.CTAHref
	existing.Align = in.Align
	existing.SortOrder = in.SortOrder
	existing.IsActive = in.IsActive
	existing.UpdatedAt = now
	existing.UpdatedBy = actor

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}

	s.audit(ctx, actor, "BANNER_UPDATED", "banner", existing.ID)
	return existing, nil
}

func (s *Service) ToggleActive(ctx context.Context, id string, actor string) (*Banner, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if existing == nil {
		return nil, ErrNotFound
	}

	targetState := !existing.IsActive
	if targetState {
		activeCount, err := s.repo.CountActive(ctx)
		if err != nil {
			return nil, err
		}
		if activeCount >= 3 {
			return nil, ErrMaxActiveBanners
		}
	}

	existing.IsActive = targetState
	existing.UpdatedAt = s.now()
	existing.UpdatedBy = actor

	if err := s.repo.Update(ctx, existing); err != nil {
		return nil, err
	}

	s.audit(ctx, actor, "BANNER_TOGGLED", "banner", existing.ID)
	return existing, nil
}

func (s *Service) Delete(ctx context.Context, id string, actor string) error {
	if _, err := uuid.Parse(id); err != nil {
		return ErrValidation
	}

	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if existing == nil {
		return ErrNotFound
	}

	if err := s.repo.Delete(ctx, id); err != nil {
		return err
	}

	s.audit(ctx, actor, "BANNER_DELETED", "banner", id)
	return nil
}
