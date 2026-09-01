package learningpath

import (
	"context"
	"errors"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
)

var slugRE = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
var keyRE = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)

type Service struct {
	repo    Repository
	sources SourcePort
	audit   audit.Repository
	now     func() time.Time
}

func NewService(repo Repository, sources SourcePort, auditRepo audit.Repository) *Service {
	return &Service{repo: repo, sources: sources, audit: auditRepo, now: func() time.Time { return time.Now().UTC() }}
}

func textOK(v string, min, max int) bool {
	v = strings.TrimSpace(v)
	return utf8.ValidString(v) && utf8.RuneCountInString(v) >= min && utf8.RuneCountInString(v) <= max
}
func kindOK(v ItemKind) bool {
	return v == KindCourse || v == KindKnowledge || v == KindMicrolearning || v == KindWebinar
}
func refOK(kind ItemKind, ref string) bool {
	ref = strings.TrimSpace(ref)
	if kind == KindCourse || kind == KindWebinar {
		n, e := strconv.Atoi(ref)
		return e == nil && n > 0
	}
	_, e := uuid.Parse(ref)
	return e == nil
}

func normalize(in *Input) error {
	in.Slug = strings.TrimSpace(in.Slug)
	in.Title = strings.Join(strings.Fields(in.Title), " ")
	in.Summary = strings.TrimSpace(in.Summary)
	in.Description = strings.TrimSpace(in.Description)
	if !slugRE.MatchString(in.Slug) || !textOK(in.Title, 3, 200) || !textOK(in.Summary, 10, 1000) || !textOK(in.Description, 20, 20000) || len(in.Items) < 1 || len(in.Items) > 50 {
		return ErrValidation
	}
	keys := map[string]bool{}
	refs := map[string]bool{}
	for i := range in.Items {
		x := &in.Items[i]
		x.Key = strings.TrimSpace(x.Key)
		x.SourceRef = strings.TrimSpace(x.SourceRef)
		x.Label = strings.Join(strings.Fields(x.Label), " ")
		x.Summary = strings.TrimSpace(x.Summary)
		if !keyRE.MatchString(x.Key) || !textOK(x.Key, 1, 80) || !kindOK(x.Kind) || !refOK(x.Kind, x.SourceRef) || !textOK(x.Label, 2, 200) || !textOK(x.Summary, 0, 1000) || keys[x.Key] || refs[string(x.Kind)+":"+x.SourceRef] {
			return ErrValidation
		}
		keys[x.Key] = true
		refs[string(x.Kind)+":"+x.SourceRef] = true
	}
	for i := range in.Items {
		seen := map[string]bool{}
		for _, p := range in.Items[i].PrerequisiteKeys {
			if !keys[p] || p == in.Items[i].Key || seen[p] {
				return ErrValidation
			}
			seen[p] = true
		}
	}
	return validateDAG(in.Items)
}

func validateDAG(items []ItemInput) error {
	graph := map[string][]string{}
	for _, x := range items {
		graph[x.Key] = x.PrerequisiteKeys
	}
	state := map[string]int{}
	var visit func(string) bool
	visit = func(k string) bool {
		if state[k] == 1 {
			return false
		}
		if state[k] == 2 {
			return true
		}
		state[k] = 1
		for _, p := range graph[k] {
			if !visit(p) {
				return false
			}
		}
		state[k] = 2
		return true
	}
	for k := range graph {
		if !visit(k) {
			return ErrValidation
		}
	}
	return nil
}
func rolesHave(roles []string, wanted string) bool {
	for _, r := range roles {
		if r == wanted || r == "Portal Administrator" {
			return true
		}
	}
	return false
}
func canEdit(roles []string) bool { return rolesHave(roles, "Content Editor") }
func canTransition(from, to Status, roles []string) bool {
	e, r := canEdit(roles), rolesHave(roles, "Reviewer")
	switch from {
	case StatusDraft:
		return to == StatusInReview && e
	case StatusInReview:
		return r && (to == StatusApproved || to == StatusDraft)
	case StatusApproved:
		return r && (to == StatusPublished || to == StatusDraft)
	case StatusPublished:
		return to == StatusArchived && (e || r)
	}
	return false
}

func (s *Service) fromInput(in Input, number int, now time.Time) *Path {
	v := Version{ID: uuid.NewString(), Number: number, Title: in.Title, Summary: in.Summary, Description: in.Description, Status: StatusDraft, CreatedAt: now, UpdatedAt: now, Items: make([]Item, len(in.Items))}
	for i, x := range in.Items {
		v.Items[i] = Item{ID: uuid.NewString(), Key: x.Key, Kind: x.Kind, SourceRef: x.SourceRef, Label: x.Label, Summary: x.Summary, SourceState: SourceDegraded, SourceCheckedAt: now, SortOrder: (i + 1) * 10, Required: x.Required, Milestone: x.Milestone, PrerequisiteKeys: append([]string(nil), x.PrerequisiteKeys...)}
	}
	return &Path{ID: uuid.NewString(), Slug: in.Slug, RowVersion: 1, CreatedAt: now, UpdatedAt: now, Version: v}
}

func (s *Service) Create(ctx context.Context, in Input, roles []string, actor string) (*Path, error) {
	if !canEdit(roles) {
		return nil, ErrForbidden
	}
	if normalize(&in) != nil {
		return nil, ErrValidation
	}
	p := s.fromInput(in, 1, s.now())
	if err := s.resolve(ctx, p, actor, false); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, p, actor); err != nil {
		return nil, err
	}
	s.record(ctx, actor, "LEARNING_PATH_CREATED", p.ID)
	return p, nil
}
func (s *Service) Update(ctx context.Context, id string, in Input, roles []string, actor string) (*Path, error) {
	if !canEdit(roles) {
		return nil, ErrForbidden
	}
	if _, e := uuid.Parse(id); e != nil || in.ExpectedRowVersion < 1 {
		return nil, ErrValidation
	}
	if normalize(&in) != nil {
		return nil, ErrValidation
	}
	cur, e := s.repo.GetAdminByID(ctx, id)
	if e != nil {
		return nil, e
	}
	if cur.Version.Status != StatusDraft {
		return nil, ErrForbidden
	}
	if cur.RowVersion != in.ExpectedRowVersion {
		return nil, ErrConflict
	}
	next := s.fromInput(in, cur.Version.Number, s.now())
	next.ID, next.CreatedAt, next.RowVersion, next.Version.ID = cur.ID, cur.CreatedAt, cur.RowVersion+1, cur.Version.ID
	next.PublishedVersionNumber = cur.PublishedVersionNumber
	if e = s.resolve(ctx, next, actor, false); e != nil {
		return nil, e
	}
	if e = s.repo.SaveDraft(ctx, next, in.ExpectedRowVersion, actor); e != nil {
		return nil, e
	}
	s.record(ctx, actor, "LEARNING_PATH_UPDATED", id)
	return next, nil
}

func (s *Service) resolve(ctx context.Context, p *Path, actor string, publishing bool) error {
	for i := range p.Version.Items {
		resolved, e := s.sources.Resolve(ctx, p.Version.Items[i].Kind, p.Version.Items[i].SourceRef, actor)
		if errors.Is(e, ErrOrphanSource) || errors.Is(e, ErrUnauthorizedSource) {
			return e
		}
		if e != nil {
			resolved = ResolvedSource{State: SourceDegraded, CheckedAt: s.now()}
		}
		if resolved.CheckedAt.IsZero() {
			resolved.CheckedAt = s.now()
		}
		if resolved.Title != "" {
			p.Version.Items[i].Label = resolved.Title
		}
		if resolved.Summary != "" {
			p.Version.Items[i].Summary = resolved.Summary
		}
		p.Version.Items[i].URL, p.Version.Items[i].SourceState, p.Version.Items[i].SourceCheckedAt = resolved.URL, resolved.State, resolved.CheckedAt
		if publishing && p.Version.Items[i].Required && resolved.State != SourceAvailable {
			return ErrRequiredSourceUnavailable
		}
	}
	return nil
}

func (s *Service) Transition(ctx context.Context, id string, to Status, roles []string, actor string) (*Path, error) {
	p, e := s.repo.GetAdminByID(ctx, id)
	if e != nil {
		return nil, e
	}
	if !canTransition(p.Version.Status, to, roles) {
		return nil, ErrInvalidTransition
	}
	if to == StatusPublished {
		if e = s.resolve(ctx, p, actor, true); e != nil {
			return nil, e
		}
		n := p.Version.Number
		p.PublishedVersionNumber = &n
		now := s.now()
		p.Version.PublishedAt = &now
	}
	now := s.now()
	if to == StatusArchived {
		p.ArchivedAt = &now
	}
	expected := p.RowVersion
	p.RowVersion++
	p.UpdatedAt = now
	p.Version.Status = to
	p.Version.UpdatedAt = now
	if e = s.repo.SaveStatus(ctx, p, expected, actor); e != nil {
		return nil, e
	}
	s.record(ctx, actor, "LEARNING_PATH_TRANSITION_"+strings.ToUpper(string(to)), id)
	return p, nil
}

func (s *Service) CreateRevision(ctx context.Context, id string, expected int64, roles []string, actor string) (*Path, error) {
	if !canEdit(roles) {
		return nil, ErrForbidden
	}
	p, e := s.repo.GetAdminByID(ctx, id)
	if e != nil {
		return nil, e
	}
	if p.RowVersion != expected {
		return nil, ErrConflict
	}
	if p.Version.Status != StatusPublished || p.PublishedVersionNumber == nil {
		return nil, ErrForbidden
	}
	now := s.now()
	p.RowVersion++
	p.Version.ID = uuid.NewString()
	p.Version.Number++
	p.Version.Status = StatusDraft
	p.Version.PublishedAt = nil
	p.Version.CreatedAt = now
	p.Version.UpdatedAt = now
	for i := range p.Version.Items {
		p.Version.Items[i].ID = uuid.NewString()
	}
	if e = s.repo.CreateRevision(ctx, p, expected, actor); e != nil {
		return nil, e
	}
	s.record(ctx, actor, "LEARNING_PATH_REVISION_CREATED", id)
	return p, nil
}

func normalizeFilter(f Filter, admin bool) (Filter, error) {
	f.Query = strings.TrimSpace(f.Query)
	f.Status = strings.TrimSpace(f.Status)
	if f.Page < 1 {
		f.Page = 1
	}
	if f.PageSize < 1 {
		f.PageSize = 12
	}
	if f.PageSize > 100 || !textOK(f.Query, 0, 100) {
		return f, ErrValidation
	}
	if !admin && f.Status != "" {
		return f, ErrValidation
	}
	valid := map[string]bool{"": true, "all": true, "draft": true, "in_review": true, "approved": true, "published": true, "archived": true}
	if admin && !valid[f.Status] {
		return f, ErrValidation
	}
	return f, nil
}
func (s *Service) List(ctx context.Context, f Filter, admin bool) (*List, error) {
	var e error
	if f, e = normalizeFilter(f, admin); e != nil {
		return nil, e
	}
	items, total, e := s.repo.List(ctx, f, admin)
	if e != nil {
		return nil, e
	}
	if items == nil {
		items = []Path{}
	}
	pages := 0
	if total > 0 {
		pages = (total + f.PageSize - 1) / f.PageSize
	}
	return &List{Data: items, Pagination: Pagination{Page: f.Page, PageSize: f.PageSize, Total: total, TotalPages: pages}}, nil
}
func (s *Service) GetAdmin(ctx context.Context, id string) (*Path, error) {
	if _, e := uuid.Parse(id); e != nil {
		return nil, ErrValidation
	}
	return s.repo.GetAdminByID(ctx, id)
}
func (s *Service) GetPublic(ctx context.Context, slug string) (*Path, error) {
	if !slugRE.MatchString(slug) {
		return nil, ErrValidation
	}
	return s.repo.GetPublicBySlug(ctx, slug)
}
func (s *Service) Options(ctx context.Context, actor string) (Options, error) {
	return s.sources.Options(ctx, actor)
}

func (s *Service) Progress(ctx context.Context, slug, subject string) (*Progress, error) {
	if !slugRE.MatchString(slug) || strings.TrimSpace(subject) == "" {
		return nil, ErrForbidden
	}
	p, e := s.repo.BindLearnerVersion(ctx, slug, subject)
	if e != nil {
		return nil, e
	}
	raw, prov := s.sources.Progress(ctx, p.Version.Items, subject)
	done := map[string]bool{}
	items := make([]ItemProgress, len(p.Version.Items))
	totalProgress := 0.0
	tracked := 0
	completed := 0
	for i, item := range p.Version.Items {
		v, ok := raw[item.Key]
		if !ok {
			v = ItemProgress{Key: item.Key, State: "unavailable", Detail: "source_unavailable"}
		}
		v.ItemID = item.ID
		v.Key = item.Key
		locked := false
		for _, pre := range item.PrerequisiteKeys {
			if !done[pre] {
				locked = true
				break
			}
		}
		if locked {
			v.Locked = true
			v.State = "locked"
			v.Progress = 0
		}
		if v.Progress >= 100 && !locked {
			done[item.Key] = true
			if item.Required {
				completed++
			}
		}
		items[i] = v
		// Optional items remain visible and actionable, but an unavailable
		// optional source (for example TASK-015) must not block path completion.
		if item.Required {
			totalProgress += v.Progress
			tracked++
		}
	}
	nextIndex := -1
	for i := range items {
		if !items[i].Locked && items[i].Progress < 100 && items[i].State != "unavailable" {
			nextIndex = i
			break
		}
	}
	progress := 0.0
	if tracked > 0 {
		progress = totalProgress / float64(tracked)
	}
	result := &Progress{Path: *p, BoundVersion: p.Version.Number, Items: items, ProgressPercent: progress, CompletedItems: completed, TotalItems: tracked, Provenance: prov}
	if nextIndex >= 0 {
		x := p.Version.Items[nextIndex]
		result.NextStep = &x
	}
	return result, nil
}

func (s *Service) record(ctx context.Context, actor, action, target string) {
	if s.audit == nil {
		return
	}
	_ = s.audit.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, TargetType: "learning_path", TargetID: target, Result: "SUCCESS", OccurredAt: s.now()})
}
func SortOptions(x []Option) {
	sort.Slice(x, func(i, j int) bool {
		if x[i].Kind == x[j].Kind {
			return x[i].Label < x[j].Label
		}
		return x[i].Kind < x[j].Kind
	})
}
