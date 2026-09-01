package learningpath

import (
	"context"
	"errors"
	"testing"
	"time"
)

type memoryRepo struct{ current, public, bound *Path }

func clonePath(p *Path) *Path {
	if p == nil {
		return nil
	}
	copy := *p
	copy.Version = p.Version
	copy.Version.Items = append([]Item(nil), p.Version.Items...)
	return &copy
}
func (r *memoryRepo) Create(_ context.Context, p *Path, _ string) error {
	r.current = clonePath(p)
	return nil
}
func (r *memoryRepo) SaveDraft(_ context.Context, p *Path, _ int64, _ string) error {
	r.current = clonePath(p)
	return nil
}
func (r *memoryRepo) SaveStatus(_ context.Context, p *Path, _ int64, _ string) error {
	r.current = clonePath(p)
	if p.Version.Status == StatusPublished {
		r.public = clonePath(p)
	}
	return nil
}
func (r *memoryRepo) CreateRevision(_ context.Context, p *Path, _ int64, _ string) error {
	r.current = clonePath(p)
	return nil
}
func (r *memoryRepo) GetAdminByID(context.Context, string) (*Path, error) {
	if r.current == nil {
		return nil, ErrNotFound
	}
	return clonePath(r.current), nil
}
func (r *memoryRepo) GetPublicBySlug(context.Context, string) (*Path, error) {
	if r.public == nil {
		return nil, ErrNotFound
	}
	return clonePath(r.public), nil
}
func (r *memoryRepo) List(context.Context, Filter, bool) ([]Path, int, error) {
	if r.current == nil {
		return nil, 0, nil
	}
	return []Path{*clonePath(r.current)}, 1, nil
}
func (r *memoryRepo) BindLearnerVersion(context.Context, string, string) (*Path, error) {
	if r.bound != nil {
		return clonePath(r.bound), nil
	}
	if r.public == nil {
		return nil, ErrNotFound
	}
	r.bound = clonePath(r.public)
	return clonePath(r.bound), nil
}

type sourceStub struct {
	states   map[string]SourceState
	progress map[string]ItemProgress
}

func (s *sourceStub) Resolve(_ context.Context, _ ItemKind, ref, _ string) (ResolvedSource, error) {
	state := s.states[ref]
	if state == "" {
		return ResolvedSource{}, ErrOrphanSource
	}
	return ResolvedSource{Title: "Source " + ref, URL: "/source/" + ref, State: state, CheckedAt: time.Now().UTC()}, nil
}
func (s *sourceStub) Progress(context.Context, []Item, string) (map[string]ItemProgress, map[string]string) {
	return s.progress, map[string]string{"course": "fresh", "webinar": "blocked_task015"}
}
func (s *sourceStub) Options(context.Context, string) (Options, error) {
	return Options{Data: []Option{}, Provenance: map[string]string{}}, nil
}

func validInput() Input {
	return Input{Slug: "jalur-aman", Title: "Jalur Aman", Summary: "Ringkasan jalur yang cukup panjang.", Description: "Deskripsi jalur yang cukup panjang untuk validasi.", Items: []ItemInput{{Key: "course-utama", Kind: KindCourse, SourceRef: "10", Label: "Course utama", Required: true}, {Key: "materi-lanjutan", Kind: KindMicrolearning, SourceRef: "11111111-1111-4111-8111-111111111111", Label: "Materi lanjutan", Required: true, PrerequisiteKeys: []string{"course-utama"}}, {Key: "webinar-opsional", Kind: KindWebinar, SourceRef: "9", Label: "Webinar opsional", Required: false, PrerequisiteKeys: []string{"materi-lanjutan"}}}}
}

func TestRejectsCycleDuplicateOrOrphan(t *testing.T) {
	svc := NewService(&memoryRepo{}, &sourceStub{states: map[string]SourceState{"10": SourceAvailable}}, nil)
	cycle := validInput()
	cycle.Items[0].PrerequisiteKeys = []string{"materi-lanjutan"}
	if _, e := svc.Create(context.Background(), cycle, []string{"Content Editor"}, "actor"); !errors.Is(e, ErrValidation) {
		t.Fatalf("cycle must fail: %v", e)
	}
	duplicate := validInput()
	duplicate.Items[1].SourceRef = duplicate.Items[0].SourceRef
	duplicate.Items[1].Kind = KindCourse
	if _, e := svc.Create(context.Background(), duplicate, []string{"Content Editor"}, "actor"); !errors.Is(e, ErrValidation) {
		t.Fatalf("duplicate must fail: %v", e)
	}
	if _, e := svc.Create(context.Background(), validInput(), []string{"Content Editor"}, "actor"); !errors.Is(e, ErrOrphanSource) {
		t.Fatalf("orphan must fail: %v", e)
	}
}

func TestWorkflowRevisionAndLearnerBindingRemainStable(t *testing.T) {
	repo := &memoryRepo{}
	sources := &sourceStub{states: map[string]SourceState{"10": SourceAvailable, "11111111-1111-4111-8111-111111111111": SourceAvailable, "9": SourceUnavailable}, progress: map[string]ItemProgress{"course-utama": {Progress: 100, State: "completed"}, "materi-lanjutan": {Progress: 35, State: "in_progress"}, "webinar-opsional": {Progress: 0, State: "unavailable"}}}
	svc := NewService(repo, sources, nil)
	path, e := svc.Create(context.Background(), validInput(), []string{"Content Editor"}, "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
	if e != nil {
		t.Fatal(e)
	}
	path, e = svc.Transition(context.Background(), path.ID, StatusInReview, []string{"Content Editor"}, "actor")
	if e != nil {
		t.Fatal(e)
	}
	path, e = svc.Transition(context.Background(), path.ID, StatusApproved, []string{"Reviewer"}, "actor")
	if e != nil {
		t.Fatal(e)
	}
	path, e = svc.Transition(context.Background(), path.ID, StatusPublished, []string{"Reviewer"}, "actor")
	if e != nil {
		t.Fatal(e)
	}
	first, e := svc.Progress(context.Background(), path.Slug, "learner")
	if e != nil {
		t.Fatal(e)
	}
	if first.BoundVersion != 1 || first.ProgressPercent != 67.5 || first.CompletedItems != 1 || first.TotalItems != 2 || first.NextStep == nil || first.NextStep.Key != "materi-lanjutan" {
		t.Fatalf("unexpected progress %#v", first)
	}
	revision, e := svc.CreateRevision(context.Background(), path.ID, path.RowVersion, []string{"Content Editor"}, "actor")
	if e != nil {
		t.Fatal(e)
	}
	if revision.Version.Number != 2 || revision.Version.Status != StatusDraft {
		t.Fatalf("bad revision %#v", revision)
	}
	second, e := svc.Progress(context.Background(), path.Slug, "learner")
	if e != nil {
		t.Fatal(e)
	}
	if second.BoundVersion != 1 {
		t.Fatalf("learner moved to version %d", second.BoundVersion)
	}
}

func TestRequiredUnavailableSourceBlocksPublish(t *testing.T) {
	repo := &memoryRepo{}
	sources := &sourceStub{states: map[string]SourceState{"10": SourceAvailable, "11111111-1111-4111-8111-111111111111": SourceAvailable, "9": SourceUnavailable}}
	svc := NewService(repo, sources, nil)
	input := validInput()
	input.Items[2].Required = true
	path, e := svc.Create(context.Background(), input, []string{"Content Editor"}, "actor")
	if e != nil {
		t.Fatal(e)
	}
	path, _ = svc.Transition(context.Background(), path.ID, StatusInReview, []string{"Content Editor"}, "actor")
	path, _ = svc.Transition(context.Background(), path.ID, StatusApproved, []string{"Reviewer"}, "actor")
	if _, e = svc.Transition(context.Background(), path.ID, StatusPublished, []string{"Reviewer"}, "actor"); !errors.Is(e, ErrRequiredSourceUnavailable) {
		t.Fatalf("required unavailable source published: %v", e)
	}
}

func TestReviewerCannotCreateAndUnknownFieldsRemainHandlerConcern(t *testing.T) {
	svc := NewService(&memoryRepo{}, &sourceStub{states: map[string]SourceState{"10": SourceAvailable, "11111111-1111-4111-8111-111111111111": SourceAvailable, "9": SourceUnavailable}}, nil)
	if _, e := svc.Create(context.Background(), validInput(), []string{"Reviewer"}, "actor"); !errors.Is(e, ErrForbidden) {
		t.Fatalf("reviewer create must fail: %v", e)
	}
}
