package microlearning

import (
	"context"
	"net/url"
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
	repo  Repository
	audit audit.Repository
	now   func() time.Time
}

func NewService(repo Repository, auditRepo audit.Repository) *Service {
	return &Service{repo: repo, audit: auditRepo, now: func() time.Time { return time.Now().UTC() }}
}

func validText(value string, min, max int, single bool) bool {
	value = strings.TrimSpace(value)
	if !utf8.ValidString(value) || utf8.RuneCountInString(value) < min || utf8.RuneCountInString(value) > max {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) && (single || (r != '\n' && r != '\r' && r != '\t')) {
			return false
		}
	}
	return !single || !strings.ContainsAny(value, "\r\n")
}

func normalizeInput(in *Input) error {
	in.Slug = strings.TrimSpace(in.Slug)
	in.Title = strings.Join(strings.Fields(in.Title), " ")
	in.Summary = strings.TrimSpace(in.Summary)
	in.Body = strings.TrimSpace(in.Body)
	in.VideoURL = strings.TrimSpace(in.VideoURL)
	in.FeaturedMediaID = strings.TrimSpace(in.FeaturedMediaID)
	in.SEOTitle = strings.Join(strings.Fields(in.SEOTitle), " ")
	in.SEODescription = strings.Join(strings.Fields(in.SEODescription), " ")
	if !slugPattern.MatchString(in.Slug) || !validText(in.Title, 3, 200, true) || !validText(in.Summary, 10, 500, false) || !validText(in.Body, 20, 20000, false) || in.DurationMinutes < 3 || in.DurationMinutes > 15 {
		return ErrValidation
	}
	if in.Format != FormatArticle && in.Format != FormatVideo && in.Format != FormatQuick {
		return ErrValidation
	}
	if in.Format == FormatVideo {
		u, err := url.ParseRequestURI(in.VideoURL)
		if err != nil || u.Scheme != "https" || u.Host == "" || u.User != nil {
			return ErrValidation
		}
	} else if in.VideoURL != "" {
		return ErrValidation
	}
	if in.FeaturedMediaID != "" {
		if _, err := uuid.Parse(in.FeaturedMediaID); err != nil {
			return ErrValidation
		}
	}
	if !validText(in.SEOTitle, 0, 70, true) || !validText(in.SEODescription, 0, 160, true) || len(in.RelatedIDs) > 8 {
		return ErrValidation
	}
	seen := map[string]struct{}{}
	for i, id := range in.RelatedIDs {
		parsed, err := uuid.Parse(strings.TrimSpace(id))
		if err != nil {
			return ErrValidation
		}
		in.RelatedIDs[i] = parsed.String()
		if _, ok := seen[in.RelatedIDs[i]]; ok {
			return ErrValidation
		}
		seen[in.RelatedIDs[i]] = struct{}{}
	}
	return nil
}

func canWrite(roles []string) bool { return hasRole(roles, "Content Editor") }
func hasRole(roles []string, role string) bool {
	for _, r := range roles {
		if r == role || r == "Portal Administrator" {
			return true
		}
	}
	return false
}
func canTransition(from, to Status, roles []string) bool {
	editor, reviewer := canWrite(roles), hasRole(roles, "Reviewer")
	switch from {
	case StatusDraft:
		return (to == StatusInReview || to == StatusArchived) && editor
	case StatusInReview:
		return reviewer && (to == StatusApproved || to == StatusDraft)
	case StatusApproved:
		return reviewer && (to == StatusPublished || to == StatusDraft)
	case StatusPublished:
		return (editor || reviewer) && to == StatusArchived
	}
	return false
}

func itemFromInput(in Input, now time.Time) *Item {
	return &Item{Slug: in.Slug, Title: in.Title, Summary: in.Summary, Body: in.Body, Format: in.Format, DurationMinutes: in.DurationMinutes, VideoURL: in.VideoURL, FeaturedMediaID: in.FeaturedMediaID, SEOTitle: in.SEOTitle, SEODescription: in.SEODescription, Indexable: in.Indexable, UpdatedAt: now, Related: []RelatedItem{}}
}

func (s *Service) validateReferences(ctx context.Context, id string, in Input) error {
	if in.FeaturedMediaID != "" {
		if err := s.repo.ValidateFeaturedMedia(ctx, in.FeaturedMediaID); err != nil {
			return ErrValidation
		}
	}
	for _, related := range in.RelatedIDs {
		if related == id {
			return ErrValidation
		}
	}
	if err := s.repo.ValidateRelated(ctx, id, in.RelatedIDs); err != nil {
		return ErrValidation
	}
	return nil
}

func (s *Service) Create(ctx context.Context, in Input, roles []string, actor string) (*Item, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if err := normalizeInput(&in); err != nil {
		return nil, err
	}
	now := s.now()
	item := itemFromInput(in, now)
	item.ID, item.Status, item.Version, item.CreatedAt = uuid.NewString(), StatusDraft, 1, now
	if err := s.validateReferences(ctx, item.ID, in); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, item, in.RelatedIDs, actor); err != nil {
		return nil, err
	}
	s.record(ctx, actor, "MICROLEARNING_CREATED", item.ID)
	return s.repo.GetByID(ctx, item.ID)
}

func (s *Service) Update(ctx context.Context, id string, in Input, roles []string, actor string) (*Item, error) {
	if !canWrite(roles) {
		return nil, ErrForbidden
	}
	if _, err := uuid.Parse(id); err != nil || in.ExpectedVersion < 1 {
		return nil, ErrValidation
	}
	if err := normalizeInput(&in); err != nil {
		return nil, err
	}
	current, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.Status != StatusDraft {
		return nil, ErrForbidden
	}
	if current.Version != in.ExpectedVersion {
		return nil, ErrConflict
	}
	if err := s.validateReferences(ctx, id, in); err != nil {
		return nil, err
	}
	item := itemFromInput(in, s.now())
	item.ID, item.Status, item.Version, item.CreatedAt = id, current.Status, current.Version+1, current.CreatedAt
	if err := s.repo.Update(ctx, item, in.RelatedIDs, in.ExpectedVersion, actor); err != nil {
		return nil, err
	}
	s.record(ctx, actor, "MICROLEARNING_UPDATED", id)
	return s.repo.GetByID(ctx, id)
}

func (s *Service) Transition(ctx context.Context, id string, next Status, roles []string, actor string) (*Item, error) {
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrValidation
	}
	item, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if !canTransition(item.Status, next, roles) {
		return nil, ErrInvalidTransition
	}
	if next == StatusPublished {
		if item.FeaturedMediaID != "" {
			if err := s.repo.ValidateFeaturedMedia(ctx, item.FeaturedMediaID); err != nil {
				return nil, ErrValidation
			}
		}
		now := s.now()
		item.PublishedAt = &now
	}
	expected := item.Version
	item.Status, item.Version, item.UpdatedAt = next, item.Version+1, s.now()
	related := make([]string, len(item.Related))
	for i := range item.Related {
		related[i] = item.Related[i].ID
	}
	if err := s.repo.Update(ctx, item, related, expected, actor); err != nil {
		return nil, err
	}
	s.record(ctx, actor, "MICROLEARNING_TRANSITION_"+strings.ToUpper(string(next)), id)
	return s.repo.GetByID(ctx, id)
}

func normalizeFilter(f ListFilter, admin bool) (ListFilter, error) {
	f.Query, f.Format, f.Status = strings.TrimSpace(f.Query), strings.TrimSpace(f.Format), strings.TrimSpace(f.Status)
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = 12
	}
	if f.PageSize > 100 || !validText(f.Query, 0, 100, true) {
		return f, ErrValidation
	}
	if f.Format != "" && f.Format != string(FormatArticle) && f.Format != string(FormatVideo) && f.Format != string(FormatQuick) {
		return f, ErrValidation
	}
	if !admin && f.Status != "" {
		return f, ErrValidation
	}
	if admin && f.Status != "" && f.Status != "all" && f.Status != string(StatusDraft) && f.Status != string(StatusInReview) && f.Status != string(StatusApproved) && f.Status != string(StatusPublished) && f.Status != string(StatusArchived) {
		return f, ErrValidation
	}
	return f, nil
}

func listResult(items []Item, total int, f ListFilter) *List {
	if items == nil {
		items = []Item{}
	}
	pages := total / f.PageSize
	if total%f.PageSize != 0 {
		pages++
	}
	return &List{Data: items, Pagination: Pagination{Page: f.Page, PageSize: f.PageSize, Total: total, TotalPages: pages}}
}
func (s *Service) ListPublic(ctx context.Context, f ListFilter) (*List, error) {
	f, e := normalizeFilter(f, false)
	if e != nil {
		return nil, e
	}
	x, n, e := s.repo.ListPublic(ctx, f)
	if e != nil {
		return nil, e
	}
	return listResult(x, n, f), nil
}
func (s *Service) ListAdmin(ctx context.Context, f ListFilter) (*List, error) {
	f, e := normalizeFilter(f, true)
	if e != nil {
		return nil, e
	}
	x, n, e := s.repo.ListAdmin(ctx, f)
	if e != nil {
		return nil, e
	}
	return listResult(x, n, f), nil
}
func (s *Service) GetPublic(ctx context.Context, slug string) (*Item, error) {
	if !slugPattern.MatchString(slug) {
		return nil, ErrValidation
	}
	return s.repo.GetPublishedBySlug(ctx, slug)
}
func (s *Service) GetAdmin(ctx context.Context, id string) (*Item, error) {
	if _, e := uuid.Parse(id); e != nil {
		return nil, ErrValidation
	}
	return s.repo.GetByID(ctx, id)
}

func (s *Service) SaveProgress(ctx context.Context, id, actor string, in ProgressInput) (*Progress, error) {
	if _, e := uuid.Parse(id); e != nil || strings.TrimSpace(actor) == "" || len(actor) > 255 || in.ProgressPercent < 0 || in.ProgressPercent > 100 || in.PositionSeconds < 0 {
		return nil, ErrValidation
	}
	item, e := s.repo.GetPublishedByID(ctx, id)
	if e != nil {
		return nil, e
	}
	if item.Format != FormatVideo && in.PositionSeconds != 0 {
		return nil, ErrValidation
	}
	if item.Format == FormatVideo && in.PositionSeconds > item.DurationMinutes*60 {
		return nil, ErrValidation
	}
	result, e := s.repo.UpsertProgress(ctx, actor, id, in)
	if e == nil {
		s.record(ctx, actor, "MICROLEARNING_PROGRESS_SAVED", id)
	}
	return result, e
}
func (s *Service) GetProgress(ctx context.Context, id, actor string) (*Progress, error) {
	if _, e := uuid.Parse(id); e != nil || strings.TrimSpace(actor) == "" {
		return nil, ErrValidation
	}
	if _, e := s.repo.GetPublishedByID(ctx, id); e != nil {
		return nil, e
	}
	return s.repo.GetProgress(ctx, actor, id)
}

func (s *Service) record(ctx context.Context, actor, action, id string) {
	if s.audit == nil {
		return
	}
	_ = s.audit.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, TargetType: "microlearning", TargetID: id, Result: "SUCCESS", OccurredAt: s.now()})
}
