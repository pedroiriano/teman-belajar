package cms

import (
	"context"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

type Service struct {
	repo      Repository
	auditRepo audit.Repository
}

func NewService(repo Repository, auditRepo audit.Repository) *Service {
	return &Service{repo: repo, auditRepo: auditRepo}
}

// News
func (s *Service) CreateDraftNews(ctx context.Context, title, slug, excerpt, body string, userID *string) (*News, error) {
	n := &News{
		ID:        uuid.NewString(),
		Slug:      slug,
		Title:     title,
		Excerpt:   excerpt,
		Body:      body,
		Status:    StatusDraft,
		CreatedAt: time.Now(),
		CreatedBy: userID,
		UpdatedAt: time.Now(),
		UpdatedBy: userID,
		Version:   1,
	}

	if err := n.Validate(); err != nil {
		return nil, err
	}

	if err := s.repo.CreateNews(ctx, n); err != nil {
		return nil, err
	}

	_ = s.repo.CreateNewsRevision(ctx, &NewsRevision{
		ID:         uuid.NewString(),
		NewsID:     n.ID,
		RevisionNo: int(n.Version),
		Title:      n.Title,
		Excerpt:    n.Excerpt,
		Body:       n.Body,
		AuthorID:   userID,
		CreatedAt:  n.CreatedAt,
	})

	// Audit log
	if s.auditRepo != nil {
		actorID := ""
		if userID != nil {
			actorID = *userID
		}
		_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: actorID,
			Action:      "CREATE_NEWS",
			TargetType:  "News",
			TargetID:    n.ID,
			Result:      "SUCCESS",
			OccurredAt:  time.Now(),
		})
	}

	return n, nil
}

func (s *Service) TransitionNews(ctx context.Context, id string, nextStatus ContentStatus, userRoles []string, userID *string) (*News, error) {
	n, err := s.repo.GetNewsByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if !CanTransitionTo(n.Status, nextStatus, userRoles) {
		return nil, ErrInvalidTransition
	}

	n.Status = nextStatus
	now := time.Now()
	n.UpdatedAt = now
	n.UpdatedBy = userID

	if nextStatus == StatusPublished && n.PublishedAt == nil {
		n.PublishedAt = &now
	}

	expectedVersion := n.Version
	n.Version++
	if err := s.repo.UpdateNews(ctx, n, expectedVersion); err != nil {
		return nil, err
	}

	// Audit log
	if s.auditRepo != nil {
		actorID := ""
		if userID != nil {
			actorID = *userID
		}
		_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: actorID,
			Action:      "TRANSITION_NEWS_" + string(nextStatus),
			TargetType:  "News",
			TargetID:    n.ID,
			Result:      "SUCCESS",
			OccurredAt:  time.Now(),
		})
	}

	return n, nil
}

func (s *Service) UpdateDraftNews(ctx context.Context, id, title, slug, excerpt, body string, expectedVersion int64, userID *string) (*News, error) {
	n, err := s.repo.GetNewsByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if n.Status != StatusDraft {
		return nil, ErrContentLocked
	}
	if expectedVersion < 1 || n.Version != expectedVersion {
		return nil, ErrConflict
	}
	n.Title, n.Slug, n.Excerpt, n.Body = title, slug, excerpt, body
	n.UpdatedAt, n.UpdatedBy = time.Now().UTC(), userID
	if err := n.Validate(); err != nil {
		return nil, err
	}
	n.Version++
	if err := s.repo.UpdateNews(ctx, n, expectedVersion); err != nil {
		return nil, err
	}
	_ = s.repo.CreateNewsRevision(ctx, &NewsRevision{
		ID:         uuid.NewString(),
		NewsID:     n.ID,
		RevisionNo: int(n.Version),
		Title:      n.Title,
		Excerpt:    n.Excerpt,
		Body:       n.Body,
		AuthorID:   userID,
		CreatedAt:  n.UpdatedAt,
	})
	s.logCMSAudit(ctx, userID, "UPDATE_NEWS_DRAFT", "News", n.ID)
	return n, nil
}

func (s *Service) ListNewsRevisions(ctx context.Context, newsID string) ([]NewsRevision, error) {
	return s.repo.ListNewsRevisions(ctx, newsID)
}

func (s *Service) GetPublicNews(ctx context.Context, page, pageSize int) (*NewsList, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	items, total, err := s.repo.ListPublicNews(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []News{}
	}

	totalPages := total / pageSize
	if total%pageSize > 0 {
		totalPages++
	}

	return &NewsList{
		Data: items,
		Pagination: Pagination{
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *Service) GetAdminNews(ctx context.Context, page, pageSize int) (*NewsList, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	items, total, err := s.repo.ListAdminNews(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []News{}
	}

	totalPages := total / pageSize
	if total%pageSize > 0 {
		totalPages++
	}

	return &NewsList{
		Data: items,
		Pagination: Pagination{
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}

func (s *Service) GetPublicNewsBySlug(ctx context.Context, slug string) (*News, error) {
	n, err := s.repo.GetNewsBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if n.Status != StatusPublished {
		return nil, ErrNotFound
	}
	return n, nil
}

// Announcements
func (s *Service) CreateDraftAnnouncement(ctx context.Context, title, slug, body string, startAt, endAt *time.Time, userID *string) (*Announcement, error) {
	a := &Announcement{
		ID:        uuid.NewString(),
		Slug:      slug,
		Title:     title,
		Body:      body,
		Status:    StatusDraft,
		StartAt:   startAt,
		EndAt:     endAt,
		CreatedAt: time.Now(),
		CreatedBy: userID,
		UpdatedAt: time.Now(),
		UpdatedBy: userID,
		Version:   1,
	}

	if err := a.Validate(); err != nil {
		return nil, err
	}

	if err := s.repo.CreateAnnouncement(ctx, a); err != nil {
		return nil, err
	}

	_ = s.repo.CreateAnnouncementRevision(ctx, &AnnouncementRevision{
		ID:             uuid.NewString(),
		AnnouncementID: a.ID,
		RevisionNo:     int(a.Version),
		Title:          a.Title,
		Body:           a.Body,
		AuthorID:       userID,
		CreatedAt:      a.CreatedAt,
	})

	// Audit log
	if s.auditRepo != nil {
		actorID := ""
		if userID != nil {
			actorID = *userID
		}
		_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: actorID,
			Action:      "CREATE_ANNOUNCEMENT",
			TargetType:  "Announcement",
			TargetID:    a.ID,
			Result:      "SUCCESS",
			OccurredAt:  time.Now(),
		})
	}

	return a, nil
}

func (s *Service) TransitionAnnouncement(ctx context.Context, id string, nextStatus ContentStatus, userRoles []string, userID *string) (*Announcement, error) {
	a, err := s.repo.GetAnnouncementByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if !CanTransitionTo(a.Status, nextStatus, userRoles) {
		return nil, ErrInvalidTransition
	}

	a.Status = nextStatus
	now := time.Now()
	a.UpdatedAt = now
	a.UpdatedBy = userID

	if nextStatus == StatusPublished && a.PublishedAt == nil {
		a.PublishedAt = &now
	}

	expectedVersion := a.Version
	a.Version++
	if err := s.repo.UpdateAnnouncement(ctx, a, expectedVersion); err != nil {
		return nil, err
	}

	// Audit log
	if s.auditRepo != nil {
		actorID := ""
		if userID != nil {
			actorID = *userID
		}
		_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: actorID,
			Action:      "TRANSITION_ANNOUNCEMENT_" + string(nextStatus),
			TargetType:  "Announcement",
			TargetID:    a.ID,
			Result:      "SUCCESS",
			OccurredAt:  time.Now(),
		})
	}

	return a, nil
}

func (s *Service) UpdateDraftAnnouncement(ctx context.Context, id, title, slug, body string, startAt, endAt *time.Time, expectedVersion int64, userID *string) (*Announcement, error) {
	a, err := s.repo.GetAnnouncementByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if a.Status != StatusDraft {
		return nil, ErrContentLocked
	}
	if expectedVersion < 1 || a.Version != expectedVersion {
		return nil, ErrConflict
	}
	a.Title, a.Slug, a.Body, a.StartAt, a.EndAt = title, slug, body, startAt, endAt
	a.UpdatedAt, a.UpdatedBy = time.Now().UTC(), userID
	if err := a.Validate(); err != nil {
		return nil, err
	}
	a.Version++
	if err := s.repo.UpdateAnnouncement(ctx, a, expectedVersion); err != nil {
		return nil, err
	}
	_ = s.repo.CreateAnnouncementRevision(ctx, &AnnouncementRevision{
		ID:             uuid.NewString(),
		AnnouncementID: a.ID,
		RevisionNo:     int(a.Version),
		Title:          a.Title,
		Body:           a.Body,
		AuthorID:       userID,
		CreatedAt:      a.UpdatedAt,
	})
	s.logCMSAudit(ctx, userID, "UPDATE_ANNOUNCEMENT_DRAFT", "Announcement", a.ID)
	return a, nil
}

func (s *Service) ListAnnouncementRevisions(ctx context.Context, announcementID string) ([]AnnouncementRevision, error) {
	return s.repo.ListAnnouncementRevisions(ctx, announcementID)
}

func (s *Service) logCMSAudit(ctx context.Context, userID *string, action, targetType, targetID string) {
	if s.auditRepo == nil {
		return
	}
	actorID := ""
	if userID != nil {
		actorID = *userID
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actorID, Action: action, TargetType: targetType, TargetID: targetID, Result: "SUCCESS", OccurredAt: time.Now().UTC()})
}

func (s *Service) GetActiveAnnouncements(ctx context.Context) (*AnnouncementList, error) {
	items, err := s.repo.ListActiveAnnouncements(ctx)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []Announcement{}
	}

	return &AnnouncementList{Data: items}, nil
}

func (s *Service) GetPublicAnnouncementBySlug(ctx context.Context, slug string) (*Announcement, error) {
	item, err := s.repo.GetAnnouncementBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if item.Status != StatusPublished || item.PublishedAt == nil || item.PublishedAt.After(now) || (item.StartAt != nil && item.StartAt.After(now)) || (item.EndAt != nil && !item.EndAt.After(now)) {
		return nil, ErrNotFound
	}
	return item, nil
}

type AnnouncementListPaginated struct {
	Data       []Announcement `json:"data"`
	Pagination Pagination     `json:"pagination"`
}

func (s *Service) GetAdminAnnouncements(ctx context.Context, page, pageSize int) (*AnnouncementListPaginated, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	items, total, err := s.repo.ListAdminAnnouncements(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []Announcement{}
	}

	totalPages := total / pageSize
	if total%pageSize > 0 {
		totalPages++
	}

	return &AnnouncementListPaginated{
		Data: items,
		Pagination: Pagination{
			Page:       page,
			PageSize:   pageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	}, nil
}
