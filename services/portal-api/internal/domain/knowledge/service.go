package knowledge

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

var (
	ErrTitleRequired    = errors.New("title is required")
	ErrSlugRequired     = errors.New("slug is required")
	ErrBodyRequired     = errors.New("body is required")
	ErrRevisionLocked   = errors.New("article must be draft or published before creating a revision")
	ErrRevisionConflict = errors.New("knowledge revision conflict")
)

type Service struct {
	repo      Repository
	auditRepo audit.Repository
}

func NewService(repo Repository, auditRepo audit.Repository) *Service {
	return &Service{
		repo:      repo,
		auditRepo: auditRepo,
	}
}

func (s *Service) CreateArticleWithRevision(ctx context.Context, title, slug, body string, summary, categoryID, actorID *string) (*Article, error) {
	if title == "" {
		return nil, ErrTitleRequired
	}
	if slug == "" {
		return nil, ErrSlugRequired
	}
	if body == "" {
		return nil, ErrBodyRequired
	}

	articleID := uuid.New().String()
	now := time.Now().UTC()

	article := &Article{
		ID:                articleID,
		Slug:              slug,
		Title:             title,
		Summary:           summary,
		Status:            StatusDraft,
		CategoryID:        categoryID,
		CurrentRevisionNo: 1,
		CreatedAt:         now,
		CreatedBy:         actorID,
		UpdatedAt:         now,
		UpdatedBy:         actorID,
	}

	if err := s.repo.CreateArticle(ctx, article); err != nil {
		return nil, err
	}

	revision := &Revision{
		ID:         uuid.New().String(),
		ArticleID:  articleID,
		RevisionNo: 1,
		Body:       body,
		AuthorID:   actorID,
		CreatedAt:  now,
	}

	if err := s.repo.CreateRevision(ctx, revision); err != nil {
		return nil, err
	}

	s.logAudit(ctx, actorID, "KNOWLEDGE_CREATED", articleID, "SUCCESS")
	s.logAudit(ctx, actorID, "KNOWLEDGE_REVISION_CREATED", revision.ID, "SUCCESS")

	return article, nil
}

func (s *Service) CreateRevision(ctx context.Context, articleID, body string, actorID *string) (*Revision, error) {
	return s.createRevision(ctx, articleID, body, 0, actorID)
}

func (s *Service) CreateRevisionExpected(ctx context.Context, articleID, body string, expectedRevisionNo int, actorID *string) (*Revision, error) {
	if expectedRevisionNo < 1 {
		return nil, ErrRevisionConflict
	}
	return s.createRevision(ctx, articleID, body, expectedRevisionNo, actorID)
}

func (s *Service) createRevision(ctx context.Context, articleID, body string, expectedRevisionNo int, actorID *string) (*Revision, error) {
	if body == "" {
		return nil, ErrBodyRequired
	}

	article, err := s.repo.GetArticleByID(ctx, articleID)
	if err != nil {
		return nil, err
	}
	if article.Status != StatusDraft && article.Status != StatusPublished {
		return nil, ErrRevisionLocked
	}
	if expectedRevisionNo > 0 && article.CurrentRevisionNo != expectedRevisionNo {
		return nil, ErrRevisionConflict
	}

	// Always increment current revision no for a new edit
	article.CurrentRevisionNo += 1
	article.Status = StatusDraft
	article.UpdatedAt = time.Now().UTC()
	article.UpdatedBy = actorID

	revision := &Revision{
		ID:         uuid.New().String(),
		ArticleID:  articleID,
		RevisionNo: article.CurrentRevisionNo,
		Body:       body,
		AuthorID:   actorID,
		CreatedAt:  time.Now().UTC(),
	}

	if err := s.repo.CreateRevisionAtomically(ctx, article, revision, article.CurrentRevisionNo-1); err != nil {
		return nil, err
	}

	s.logAudit(ctx, actorID, "KNOWLEDGE_REVISION_CREATED", revision.ID, "SUCCESS")

	return revision, nil
}

func (s *Service) TransitionStatus(ctx context.Context, articleID string, nextStatus ArticleStatus, actorID *string) error {
	return s.transitionStatus(ctx, articleID, nextStatus, nil, actorID, false)
}

func (s *Service) TransitionStatusAuthorized(ctx context.Context, articleID string, nextStatus ArticleStatus, roles []string, actorID *string) error {
	return s.transitionStatus(ctx, articleID, nextStatus, roles, actorID, true)
}

func (s *Service) transitionStatus(ctx context.Context, articleID string, nextStatus ArticleStatus, roles []string, actorID *string, enforceRoles bool) error {
	article, err := s.repo.GetArticleByID(ctx, articleID)
	if err != nil {
		return err
	}

	if enforceRoles && !CanTransitionWithRoles(article.Status, nextStatus, roles) {
		return ErrForbidden
	}

	if err := article.TransitionTo(nextStatus); err != nil {
		return err
	}

	article.UpdatedAt = time.Now().UTC()
	article.UpdatedBy = actorID

	// Update last reviewed if it's approved
	if nextStatus == StatusApproved || nextStatus == StatusPublished {
		now := time.Now().UTC()
		article.LastReviewedAt = &now
	}

	if err := s.repo.UpdateArticle(ctx, article); err != nil {
		return err
	}

	actionName := "KNOWLEDGE_TRANSITION_" + string(nextStatus)
	s.logAudit(ctx, actorID, actionName, articleID, "SUCCESS")

	return nil
}

type ArticleList struct {
	Data       []Article  `json:"data"`
	Pagination Pagination `json:"pagination"`
}

type Pagination struct {
	Page       int `json:"page"`
	PageSize   int `json:"page_size"`
	Total      int `json:"total"`
	TotalPages int `json:"total_pages"`
}

func normalizePagination(page, pageSize int) (int, int) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	return page, pageSize
}

func articleList(items []Article, total, page, pageSize int) *ArticleList {
	totalPages := total / pageSize
	if total%pageSize > 0 {
		totalPages++
	}
	if items == nil {
		items = []Article{}
	}
	return &ArticleList{Data: items, Pagination: Pagination{Page: page, PageSize: pageSize, Total: total, TotalPages: totalPages}}
}

func (s *Service) ListPublicArticles(ctx context.Context, page, pageSize int, categoryID, nodeID *string) (*ArticleList, error) {
	page, pageSize = normalizePagination(page, pageSize)
	if nodeID != nil {
		if _, err := uuid.Parse(*nodeID); err != nil {
			return nil, ErrInvalidNode
		}
	}
	items, total, err := s.repo.ListPublicArticles(ctx, page, pageSize, categoryID, nodeID)
	if err != nil {
		return nil, err
	}
	return articleList(items, total, page, pageSize), nil
}

func (s *Service) ListAdminArticles(ctx context.Context, page, pageSize int) (*ArticleList, error) {
	page, pageSize = normalizePagination(page, pageSize)
	items, total, err := s.repo.ListAdminArticles(ctx, page, pageSize)
	if err != nil {
		return nil, err
	}
	return articleList(items, total, page, pageSize), nil
}

func (s *Service) GetAdminArticleWithRevision(ctx context.Context, id string) (*Article, *Revision, error) {
	article, err := s.repo.GetArticleByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}
	revision, err := s.repo.GetRevision(ctx, article.ID, article.CurrentRevisionNo)
	if err != nil {
		return nil, nil, err
	}
	return article, revision, nil
}

func (s *Service) ListRevisions(ctx context.Context, articleID string) ([]Revision, error) {
	return s.repo.ListRevisions(ctx, articleID)
}

func (s *Service) GetRevision(ctx context.Context, articleID string, revisionNo int) (*Revision, error) {
	return s.repo.GetRevision(ctx, articleID, revisionNo)
}

func (s *Service) AddRelatedArticle(ctx context.Context, articleID1, articleID2 string, actorID *string) error {
	if articleID1 == articleID2 {
		return errors.New("cannot relate article to itself")
	}

	err := s.repo.AddRelatedArticle(ctx, articleID1, articleID2)
	if err != nil {
		return err
	}

	s.logAudit(ctx, actorID, "KNOWLEDGE_RELATED_UPDATED", articleID1, "SUCCESS")
	return nil
}

func (s *Service) RemoveRelatedArticle(ctx context.Context, articleID1, articleID2 string, actorID *string) error {
	err := s.repo.RemoveRelatedArticle(ctx, articleID1, articleID2)
	if err != nil {
		return err
	}

	s.logAudit(ctx, actorID, "KNOWLEDGE_RELATED_UPDATED", articleID1, "SUCCESS")
	return nil
}

func (s *Service) GetPublicArticleWithRevision(ctx context.Context, slug string) (*Article, *Revision, []Article, error) {
	article, err := s.repo.GetArticleBySlug(ctx, slug)
	if err != nil {
		return nil, nil, nil, err
	}

	// An article is public if it has a published revision, regardless of the status of its current draft.
	if article.PublishedRevisionNo == nil {
		return nil, nil, nil, ErrArticleNotFound
	}

	rev, err := s.repo.GetRevision(ctx, article.ID, *article.PublishedRevisionNo)
	if err != nil {
		return nil, nil, nil, err
	}

	related, err := s.repo.ListRelatedArticles(ctx, article.ID)
	if err != nil {
		related = []Article{}
	}

	return article, rev, related, nil
}

func (s *Service) logAudit(ctx context.Context, actorID *string, action, targetID, result string) {
	if s.auditRepo == nil {
		return
	}

	var actorStr string
	if actorID != nil {
		actorStr = *actorID
	}

	event := &audit.AuditEvent{
		ID:          uuid.New().String(),
		ActorUserID: actorStr,
		Action:      action,
		TargetType:  "knowledge",
		TargetID:    targetID,
		Result:      result,
		OccurredAt:  time.Now().UTC(),
	}

	// best effort
	_ = s.auditRepo.CreateEvent(ctx, event)
}
