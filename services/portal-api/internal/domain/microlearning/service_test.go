package microlearning

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepository struct {
	items    map[string]*Item
	progress map[string]*Progress
	mediaOK  bool
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{items: map[string]*Item{}, progress: map[string]*Progress{}, mediaOK: true}
}
func cloneItem(x *Item) *Item {
	if x == nil {
		return nil
	}
	copy := *x
	copy.Related = append([]RelatedItem(nil), x.Related...)
	return &copy
}
func (r *fakeRepository) Create(_ context.Context, x *Item, _ []string, _ string) error {
	for _, item := range r.items {
		if item.Slug == x.Slug {
			return ErrConflict
		}
	}
	r.items[x.ID] = cloneItem(x)
	return nil
}
func (r *fakeRepository) Update(_ context.Context, x *Item, _ []string, expected int64, _ string) error {
	current := r.items[x.ID]
	if current == nil {
		return ErrNotFound
	}
	if current.Version != expected {
		return ErrConflict
	}
	r.items[x.ID] = cloneItem(x)
	return nil
}
func (r *fakeRepository) GetByID(_ context.Context, id string) (*Item, error) {
	x := r.items[id]
	if x == nil {
		return nil, ErrNotFound
	}
	return cloneItem(x), nil
}
func (r *fakeRepository) GetPublishedByID(ctx context.Context, id string) (*Item, error) {
	x, e := r.GetByID(ctx, id)
	if e != nil || x.Status != StatusPublished {
		return nil, ErrNotFound
	}
	return x, nil
}
func (r *fakeRepository) GetPublishedBySlug(_ context.Context, slug string) (*Item, error) {
	for _, x := range r.items {
		if x.Slug == slug && x.Status == StatusPublished {
			return cloneItem(x), nil
		}
	}
	return nil, ErrNotFound
}
func (r *fakeRepository) ListPublic(_ context.Context, _ ListFilter) ([]Item, int, error) {
	return []Item{}, 0, nil
}
func (r *fakeRepository) ListAdmin(_ context.Context, _ ListFilter) ([]Item, int, error) {
	return []Item{}, 0, nil
}
func (r *fakeRepository) ValidateFeaturedMedia(_ context.Context, _ string) error {
	if !r.mediaOK {
		return ErrValidation
	}
	return nil
}
func (r *fakeRepository) ValidateRelated(_ context.Context, _ string, _ []string) error { return nil }
func (r *fakeRepository) UpsertProgress(_ context.Context, user, id string, in ProgressInput) (*Progress, error) {
	key := user + id
	if old := r.progress[key]; old != nil && old.ProgressPercent == in.ProgressPercent && old.PositionSeconds == in.PositionSeconds {
		return old, nil
	}
	x := &Progress{ItemID: id, ProgressPercent: in.ProgressPercent, PositionSeconds: in.PositionSeconds, UpdatedAt: time.Now(), Source: "portal", State: "editorial_activity", FormalCompletion: false}
	r.progress[key] = x
	return x, nil
}
func (r *fakeRepository) GetProgress(_ context.Context, user, id string) (*Progress, error) {
	if x := r.progress[user+id]; x != nil {
		return x, nil
	}
	return &Progress{ItemID: id, Source: "portal", State: "editorial_activity", FormalCompletion: false}, nil
}

func validInput() Input {
	return Input{Slug: "aman-dalam-lima-menit", Title: "Aman dalam lima menit", Summary: "Ringkasan materi yang cukup panjang.", Body: "Materi editorial singkat yang tetap mempunyai isi bermakna.", Format: FormatQuick, DurationMinutes: 5, Indexable: true}
}
func editorRoles() []string   { return []string{"Content Editor"} }
func reviewerRoles() []string { return []string{"Reviewer"} }

func TestCreateValidatesEditorialBoundary(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*Input)
	}{
		{"duration below three", func(x *Input) { x.DurationMinutes = 2 }},
		{"duration above fifteen", func(x *Input) { x.DurationMinutes = 16 }},
		{"video requires https", func(x *Input) { x.Format = FormatVideo; x.VideoURL = "http://example.test/video.mp4" }},
		{"article rejects video url", func(x *Input) { x.VideoURL = "https://example.test/video.mp4" }},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repo := newFakeRepository()
			svc := NewService(repo, nil)
			in := validInput()
			tt.mutate(&in)
			if _, err := svc.Create(context.Background(), in, editorRoles(), "actor"); !errors.Is(err, ErrValidation) {
				t.Fatalf("expected validation, got %v", err)
			}
		})
	}
}

func TestReviewerCannotCreateOrEdit(t *testing.T) {
	repo := newFakeRepository()
	svc := NewService(repo, nil)
	if _, err := svc.Create(context.Background(), validInput(), reviewerRoles(), "reviewer"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("expected forbidden, got %v", err)
	}
}

func TestWorkflowAndPortalProvenance(t *testing.T) {
	repo := newFakeRepository()
	svc := NewService(repo, nil)
	now := time.Date(2026, 8, 27, 2, 0, 0, 0, time.UTC)
	svc.now = func() time.Time { return now }
	item, err := svc.Create(context.Background(), validInput(), editorRoles(), "editor")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = svc.Transition(context.Background(), item.ID, StatusPublished, reviewerRoles(), "reviewer"); !errors.Is(err, ErrInvalidTransition) {
		t.Fatalf("publish must not skip review: %v", err)
	}
	item, err = svc.Transition(context.Background(), item.ID, StatusInReview, editorRoles(), "editor")
	if err != nil {
		t.Fatal(err)
	}
	item, err = svc.Transition(context.Background(), item.ID, StatusApproved, reviewerRoles(), "reviewer")
	if err != nil {
		t.Fatal(err)
	}
	item, err = svc.Transition(context.Background(), item.ID, StatusPublished, reviewerRoles(), "reviewer")
	if err != nil {
		t.Fatal(err)
	}
	progress, err := svc.SaveProgress(context.Background(), item.ID, "learner", ProgressInput{ProgressPercent: 40})
	if err != nil {
		t.Fatal(err)
	}
	if progress.Source != "portal" || progress.State != "editorial_activity" || progress.FormalCompletion {
		t.Fatalf("progress provenance must remain Portal editorial: %#v", progress)
	}
	again, err := svc.SaveProgress(context.Background(), item.ID, "learner", ProgressInput{ProgressPercent: 40})
	if err != nil {
		t.Fatal(err)
	}
	if !again.UpdatedAt.Equal(progress.UpdatedAt) {
		t.Fatal("repeated progress write must be idempotent")
	}
}

func TestProgressRejectsUnpublishedAndMalformedPosition(t *testing.T) {
	repo := newFakeRepository()
	svc := NewService(repo, nil)
	item, err := svc.Create(context.Background(), validInput(), editorRoles(), "editor")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = svc.SaveProgress(context.Background(), item.ID, "learner", ProgressInput{ProgressPercent: 10}); !errors.Is(err, ErrNotFound) {
		t.Fatalf("unpublished item must be unavailable, got %v", err)
	}
	item.Status = StatusPublished
	repo.items[item.ID] = item
	if _, err = svc.SaveProgress(context.Background(), item.ID, "learner", ProgressInput{ProgressPercent: 10, PositionSeconds: 1}); !errors.Is(err, ErrValidation) {
		t.Fatalf("non-video position must fail, got %v", err)
	}
}
