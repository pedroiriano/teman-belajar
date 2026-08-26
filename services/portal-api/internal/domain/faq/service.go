package faq

import (
	"context"
	"regexp"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

var slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type Service struct {
	repo      Repository
	auditRepo audit.Repository
	now       func() time.Time
}

func NewService(repo Repository, auditRepo audit.Repository) *Service {
	return &Service{repo: repo, auditRepo: auditRepo, now: func() time.Time { return time.Now().UTC() }}
}

func cleanSingleLine(value string) string { return strings.Join(strings.Fields(value), " ") }

func validText(value string, min, max int, singleLine bool) bool {
	value = strings.TrimSpace(value)
	if !utf8.ValidString(value) || utf8.RuneCountInString(value) < min || utf8.RuneCountInString(value) > max {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) && (singleLine || (r != '\n' && r != '\r' && r != '\t')) {
			return false
		}
	}
	return !singleLine || !strings.ContainsAny(value, "\r\n")
}

func validateCategory(in *CategoryInput) error {
	in.Name, in.Slug, in.Description = cleanSingleLine(in.Name), strings.TrimSpace(in.Slug), strings.TrimSpace(in.Description)
	if !validText(in.Name, 2, 120, true) || !slugPattern.MatchString(in.Slug) || !validText(in.Slug, 2, 120, true) || !validText(in.Description, 0, 500, false) || in.SortOrder < 0 || in.SortOrder > 10000 {
		return ErrValidation
	}
	return nil
}

func validateItem(in *ItemInput) error {
	in.CategoryID, in.Slug, in.Question, in.Answer = strings.TrimSpace(in.CategoryID), strings.TrimSpace(in.Slug), cleanSingleLine(in.Question), strings.TrimSpace(in.Answer)
	if _, err := uuid.Parse(in.CategoryID); err != nil {
		return ErrValidation
	}
	if !slugPattern.MatchString(in.Slug) || !validText(in.Slug, 2, 160, true) || !validText(in.Question, 5, 300, true) || !validText(in.Answer, 10, 10000, false) || in.SortOrder < 0 || in.SortOrder > 10000 {
		return ErrValidation
	}
	if !validText(in.SEOTitle, 0, 200, true) || !validText(in.MetaDescription, 0, 500, false) {
		return ErrValidation
	}
	if in.MediaAssetID != nil {
		if _, err := uuid.Parse(*in.MediaAssetID); err != nil || in.MediaAlt == nil || !validText(*in.MediaAlt, 1, 255, true) {
			return ErrValidation
		}
	} else if in.MediaAlt != nil {
		return ErrValidation
	}
	return nil
}

func hasRole(roles []string, role string) bool {
	for _, current := range roles {
		if current == role || current == "Portal Administrator" {
			return true
		}
	}
	return false
}

func canWrite(roles []string) bool { return hasRole(roles, "Content Editor") }

func canTransition(current, next Status, roles []string) bool {
	editor, reviewer := canWrite(roles), hasRole(roles, "Reviewer")
	switch current {
	case StatusDraft:
		return (next == StatusInReview && editor) || (next == StatusArchived && editor)
	case StatusInReview:
		return reviewer && (next == StatusApproved || next == StatusDraft)
	case StatusApproved:
		return reviewer && (next == StatusPublished || next == StatusDraft)
	case StatusPublished:
		return next == StatusArchived && (editor || reviewer)
	}
	return false
}

func (s *Service) CreateCategory(ctx context.Context, in CategoryInput, roles []string, actor string) (*Category, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if err := validateCategory(&in); err != nil {
		return nil, err
	}
	now := s.now()
	item := &Category{ID: uuid.NewString(), Slug: in.Slug, Name: in.Name, Description: in.Description, SortOrder: in.SortOrder, Status: "active", CreatedAt: now, UpdatedAt: now}
	if err := s.repo.CreateCategory(ctx, item, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "FAQ_CATEGORY_CREATED", "faq_category", item.ID)
	return item, nil
}

func (s *Service) ListCategories(ctx context.Context, includeArchived bool) ([]Category, error) {
	items, err := s.repo.ListCategories(ctx, includeArchived)
	if items == nil {
		items = []Category{}
	}
	return items, err
}

func (s *Service) ArchiveCategory(ctx context.Context, id string, roles []string, actor string) error {
	if !canWrite(roles) {
		return ErrForbidden
	}
	if _, err := uuid.Parse(id); err != nil {
		return ErrValidation
	}
	used, err := s.repo.CategoryHasLiveItems(ctx, id)
	if err != nil {
		return err
	}
	if used {
		return ErrCategoryInUse
	}
	if err := s.repo.ArchiveCategory(ctx, id, actor); err != nil {
		return err
	}
	s.audit(ctx, actor, "FAQ_CATEGORY_ARCHIVED", "faq_category", id)
	return nil
}

func (s *Service) CreateItem(ctx context.Context, in ItemInput, roles []string, actor string) (*Item, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if err := validateItem(&in); err != nil {
		return nil, err
	}
	active, err := s.repo.CategoryActive(ctx, in.CategoryID)
	if err != nil {
		return nil, err
	}
	if !active {
		return nil, ErrValidation
	}
	now := s.now()
	item := &Item{ID: uuid.NewString(), CategoryID: in.CategoryID, Slug: in.Slug, Question: in.Question, Answer: in.Answer, SortOrder: in.SortOrder, Status: StatusDraft, MediaAssetID: in.MediaAssetID, MediaAlt: in.MediaAlt, SEOTitle: strings.TrimSpace(in.SEOTitle), MetaDescription: strings.TrimSpace(in.MetaDescription), Indexable: in.Indexable, Version: 1, CreatedAt: now, UpdatedAt: now}
	if err := s.repo.CreateItem(ctx, item, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "FAQ_CREATED", "faq_item", item.ID)
	return item, nil
}

func (s *Service) UpdateItem(ctx context.Context, id string, in ItemInput, roles []string, actor string) (*Item, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	if err := validateItem(&in); err != nil || in.ExpectedVersion < 1 {
		return nil, ErrValidation
	}
	item, err := s.repo.GetItem(ctx, id)
	if err != nil {
		return nil, err
	}
	if item.Status != StatusDraft {
		return nil, ErrForbidden
	}
	if item.Version != in.ExpectedVersion {
		return nil, ErrConflict
	}
	active, err := s.repo.CategoryActive(ctx, in.CategoryID)
	if err != nil || !active {
		if err != nil {
			return nil, err
		}
		return nil, ErrValidation
	}
	item.CategoryID, item.Slug, item.Question, item.Answer, item.SortOrder = in.CategoryID, in.Slug, in.Question, in.Answer, in.SortOrder
	item.MediaAssetID, item.MediaAlt, item.SEOTitle, item.MetaDescription, item.Indexable = in.MediaAssetID, in.MediaAlt, strings.TrimSpace(in.SEOTitle), strings.TrimSpace(in.MetaDescription), in.Indexable
	item.UpdatedAt, item.Version = s.now(), item.Version+1
	if err := s.repo.UpdateItem(ctx, item, in.ExpectedVersion, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "FAQ_UPDATED", "faq_item", id)
	return item, nil
}

func (s *Service) Transition(ctx context.Context, id string, next Status, roles []string, actor string) (*Item, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	item, err := s.repo.GetItem(ctx, id)
	if err != nil {
		return nil, err
	}
	if !canTransition(item.Status, next, roles) {
		return nil, ErrInvalidTransition
	}
	if next == StatusPublished {
		active, err := s.repo.CategoryActive(ctx, item.CategoryID)
		if err != nil {
			return nil, err
		}
		if !active {
			return nil, ErrValidation
		}
		now := s.now()
		item.PublishedAt = &now
	}
	expected := item.Version
	item.Status, item.Version, item.UpdatedAt = next, item.Version+1, s.now()
	if err := s.repo.UpdateItem(ctx, item, expected, actor); err != nil {
		return nil, err
	}
	s.audit(ctx, actor, "FAQ_TRANSITION_"+strings.ToUpper(string(next)), "faq_item", id)
	return item, nil
}

func (s *Service) GetItem(ctx context.Context, id string) (*Item, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	return s.repo.GetItem(ctx, id)
}

func normalizeFilter(filter ListFilter) (ListFilter, error) {
	filter.Query, filter.Status, filter.CategoryID = strings.TrimSpace(filter.Query), strings.TrimSpace(filter.Status), strings.TrimSpace(filter.CategoryID)
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 20
	}
	if filter.PageSize > 100 || !validText(filter.Query, 0, 100, true) {
		return filter, ErrValidation
	}
	if filter.Status != "" && filter.Status != "all" && filter.Status != string(StatusDraft) && filter.Status != string(StatusInReview) && filter.Status != string(StatusApproved) && filter.Status != string(StatusPublished) && filter.Status != string(StatusArchived) {
		return filter, ErrValidation
	}
	if filter.CategoryID != "" {
		if _, err := uuid.Parse(filter.CategoryID); err != nil {
			return filter, ErrValidation
		}
	}
	return filter, nil
}

func (s *Service) ListAdmin(ctx context.Context, filter ListFilter) (*ItemList, error) {
	filter, err := normalizeFilter(filter)
	if err != nil {
		return nil, err
	}
	items, total, err := s.repo.ListAdminItems(ctx, filter)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []Item{}
	}
	pages := total / filter.PageSize
	if total%filter.PageSize != 0 {
		pages++
	}
	return &ItemList{Data: items, Pagination: Pagination{Page: filter.Page, PageSize: filter.PageSize, Total: total, TotalPages: pages}}, nil
}

func (s *Service) ListPublic(ctx context.Context, query string) (*PublicResult, error) {
	query = strings.TrimSpace(query)
	if !validText(query, 0, 100, true) {
		return nil, ErrValidation
	}
	items, total, err := s.repo.ListPublic(ctx, query)
	if err != nil {
		return nil, err
	}
	if items == nil {
		items = []PublicCategory{}
	}
	return &PublicResult{Data: items, Total: total}, nil
}

func (s *Service) audit(ctx context.Context, actor, action, targetType, targetID string) {
	if s.auditRepo == nil {
		return
	}
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, TargetType: targetType, TargetID: targetID, Result: "SUCCESS", OccurredAt: s.now()})
}
