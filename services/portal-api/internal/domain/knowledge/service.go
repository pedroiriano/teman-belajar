package knowledge

import (
	"context"
	"errors"
	"time"

	"teman-belajar-api/internal/domain/audit"
	"github.com/google/uuid"
)

var (
	ErrTitleRequired = errors.New("title is required")
	ErrSlugRequired  = errors.New("slug is required")
	ErrBodyRequired  = errors.New("body is required")
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
	if body == "" {
		return nil, ErrBodyRequired
	}

	article, err := s.repo.GetArticleByID(ctx, articleID)
	if err != nil {
		return nil, err
	}

	// Always increment current revision no for a new edit
	article.CurrentRevisionNo += 1
	article.UpdatedAt = time.Now().UTC()
	article.UpdatedBy = actorID

	if err := s.repo.UpdateArticle(ctx, article); err != nil {
		return nil, err
	}

	revision := &Revision{
		ID:         uuid.New().String(),
		ArticleID:  articleID,
		RevisionNo: article.CurrentRevisionNo,
		Body:       body,
		AuthorID:   actorID,
		CreatedAt:  time.Now().UTC(),
	}

	if err := s.repo.CreateRevision(ctx, revision); err != nil {
		return nil, err
	}

	s.logAudit(ctx, actorID, "KNOWLEDGE_REVISION_CREATED", revision.ID, "SUCCESS")

	return revision, nil
}

func (s *Service) TransitionStatus(ctx context.Context, articleID string, nextStatus ArticleStatus, actorID *string) error {
	article, err := s.repo.GetArticleByID(ctx, articleID)
	if err != nil {
		return err
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
		ID:           uuid.New().String(),
		ActorUserID:  actorStr,
		Action:       action,
		TargetType:   "knowledge",
		TargetID:     targetID,
		Result:       result,
		OccurredAt:   time.Now().UTC(),
	}

	// best effort
	_ = s.auditRepo.CreateEvent(ctx, event)
}
