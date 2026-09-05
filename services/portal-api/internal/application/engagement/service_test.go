package engagement

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	domain "teman-belajar-api/internal/domain/engagement"
)

type memoryRepository struct {
	mu        sync.Mutex
	bookmarks map[string]domain.Bookmark
	ratings   map[string]domain.Rating
	views     map[string]domain.RecentView
	now       time.Time
}

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{bookmarks: map[string]domain.Bookmark{}, ratings: map[string]domain.Rating{}, views: map[string]domain.RecentView{}, now: time.Date(2026, 8, 18, 0, 0, 0, 0, time.UTC)}
}

func itemKey(user string, target domain.Target) string {
	return user + "|" + string(target.Type) + "|" + target.ID
}

func (r *memoryRepository) tick() time.Time { r.now = r.now.Add(time.Second); return r.now }

func (r *memoryRepository) UpsertBookmark(_ context.Context, user string, target domain.Target) (domain.Bookmark, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := itemKey(user, target)
	if value, ok := r.bookmarks[key]; ok {
		return value, nil
	}
	value := domain.Bookmark{ID: uuid.NewString(), UserKey: user, Target: target, CreatedAt: r.tick()}
	r.bookmarks[key] = value
	return value, nil
}

func (r *memoryRepository) DeleteBookmark(_ context.Context, user string, target domain.Target) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.bookmarks, itemKey(user, target))
	return nil
}

func (r *memoryRepository) ListBookmarks(_ context.Context, user string, limit int) ([]domain.Bookmark, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []domain.Bookmark{}
	for _, value := range r.bookmarks {
		if value.UserKey == user {
			out = append(out, value)
		}
	}
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (r *memoryRepository) UpsertRating(_ context.Context, user string, target domain.Target, value int) (domain.Rating, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := itemKey(user, target)
	now := r.tick()
	rating, ok := r.ratings[key]
	if !ok {
		rating = domain.Rating{ID: uuid.NewString(), UserKey: user, Target: target, CreatedAt: now}
	}
	rating.Value, rating.UpdatedAt = value, now
	r.ratings[key] = rating
	return rating, nil
}

func (r *memoryRepository) DeleteRating(_ context.Context, user string, target domain.Target) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.ratings, itemKey(user, target))
	return nil
}

func (r *memoryRepository) GetRating(_ context.Context, user string, target domain.Target) (*domain.Rating, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	value, ok := r.ratings[itemKey(user, target)]
	if !ok {
		return nil, nil
	}
	return &value, nil
}

func (r *memoryRepository) ListRatings(_ context.Context, user string, limit int) ([]domain.Rating, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := []domain.Rating{}
	for _, value := range r.ratings {
		if value.UserKey == user {
			out = append(out, value)
		}
	}
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

func (r *memoryRepository) GetRatingSummary(_ context.Context, target domain.Target) (domain.RatingSummary, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	total, count := 0, 0
	for _, value := range r.ratings {
		if value.Target == target {
			total += value.Value
			count++
		}
	}
	if count == 0 {
		return domain.RatingSummary{}, nil
	}
	return domain.RatingSummary{Average: float64(total) / float64(count), Count: count}, nil
}

func (r *memoryRepository) UpsertRecentView(_ context.Context, user string, target domain.Target, retention int) (domain.RecentView, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	key := itemKey(user, target)
	now := r.tick()
	view, ok := r.views[key]
	if !ok {
		view = domain.RecentView{ID: uuid.NewString(), UserKey: user, Target: target, FirstViewedAt: now}
	}
	view.LastViewedAt = now
	view.ViewCount++
	r.views[key] = view
	for len(r.viewsFor(user)) > retention {
		oldestKey := ""
		var oldest time.Time
		for candidateKey, candidate := range r.views {
			if candidate.UserKey == user && (oldestKey == "" || candidate.LastViewedAt.Before(oldest)) {
				oldestKey, oldest = candidateKey, candidate.LastViewedAt
			}
		}
		delete(r.views, oldestKey)
	}
	return view, nil
}

func (r *memoryRepository) viewsFor(user string) []domain.RecentView {
	out := []domain.RecentView{}
	for _, value := range r.views {
		if value.UserKey == user {
			out = append(out, value)
		}
	}
	return out
}

func (r *memoryRepository) ListRecentViews(_ context.Context, user string, limit int) ([]domain.RecentView, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	out := r.viewsFor(user)
	if len(out) > limit {
		out = out[:limit]
	}
	return out, nil
}

type targetResolverStub struct {
	targets map[domain.Target]domain.ResolvedTarget
	hidden  map[domain.Target]bool
}

func (r targetResolverStub) Resolve(_ context.Context, target domain.Target) (domain.ResolvedTarget, error) {
	if r.hidden[target] {
		return domain.ResolvedTarget{}, domain.ErrTargetUnavailable
	}
	value, ok := r.targets[target]
	if !ok {
		return domain.ResolvedTarget{}, domain.ErrTargetUnavailable
	}
	return value, nil
}

type discoveryStub struct {
	candidates []domain.Candidate
	err        error
}

func (d discoveryStub) Discover(context.Context, domain.CandidateQuery) ([]domain.Candidate, error) {
	return d.candidates, d.err
}

func resolved(target domain.Target, title, category string, published time.Time) domain.ResolvedTarget {
	return domain.ResolvedTarget{Target: target, Title: title, URL: "/knowledge/" + target.ID, CategoryID: category, Tags: []string{}, PublishedAt: &published}
}

func TestParseTargetUsesStrictKnowledgeUUIDAllowlist(t *testing.T) {
	id := uuid.NewString()
	if target, err := ParseTarget("knowledge", id); err != nil || target.ID != id {
		t.Fatalf("valid knowledge target rejected: %#v %v", target, err)
	}
	for _, input := range [][2]string{{"course", "12"}, {"anything", id}, {"knowledge", "../secret"}} {
		if _, err := ParseTarget(input[0], input[1]); !errors.Is(err, domain.ErrInvalidTarget) {
			t.Fatalf("target %v was not rejected", input)
		}
	}
}

func TestBookmarkIsIdempotentIsolatedAndRejectsUnavailableTarget(t *testing.T) {
	target := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	now := time.Now().UTC()
	repo := newMemoryRepository()
	service := NewService(repo, targetResolverStub{targets: map[domain.Target]domain.ResolvedTarget{target: resolved(target, "Public", uuid.NewString(), now)}, hidden: map[domain.Target]bool{}}, discoveryStub{})
	for range 2 {
		if _, err := service.PutBookmark(context.Background(), "user-a", target); err != nil {
			t.Fatal(err)
		}
	}
	if got := len(repo.bookmarks); got != 1 {
		t.Fatalf("bookmark rows=%d, want 1", got)
	}
	if items, _ := service.ListBookmarks(context.Background(), "user-b"); len(items) != 0 {
		t.Fatalf("cross-user bookmark leaked: %#v", items)
	}
	if err := service.DeleteBookmark(context.Background(), "user-a", target); err != nil {
		t.Fatal(err)
	}
	if err := service.DeleteBookmark(context.Background(), "user-a", target); err != nil {
		t.Fatal(err)
	}
	hiddenService := NewService(repo, targetResolverStub{targets: map[domain.Target]domain.ResolvedTarget{}, hidden: map[domain.Target]bool{target: true}}, discoveryStub{})
	if _, err := hiddenService.PutBookmark(context.Background(), "user-a", target); !errors.Is(err, domain.ErrTargetUnavailable) {
		t.Fatalf("hidden target error=%v", err)
	}
}

func TestRatingBoundsUpdateAggregateAndIsolation(t *testing.T) {
	target := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	now := time.Now().UTC()
	repo := newMemoryRepository()
	service := NewService(repo, targetResolverStub{targets: map[domain.Target]domain.ResolvedTarget{target: resolved(target, "Article", uuid.NewString(), now)}, hidden: map[domain.Target]bool{}}, discoveryStub{})
	for _, value := range []int{0, 6} {
		if _, _, err := service.PutRating(context.Background(), "user-a", target, value); !errors.Is(err, domain.ErrInvalidRating) {
			t.Fatalf("rating %d error=%v", value, err)
		}
	}
	if _, _, err := service.PutRating(context.Background(), "user-a", target, 1); err != nil {
		t.Fatal(err)
	}
	_, summary, err := service.PutRating(context.Background(), "user-a", target, 5)
	if err != nil {
		t.Fatal(err)
	}
	if summary.Count != 1 || summary.Average != 5 {
		t.Fatalf("summary=%#v", summary)
	}
	rating, _, err := service.GetMyRating(context.Background(), "user-b", target)
	if err != nil || rating != nil {
		t.Fatalf("cross-user rating leaked: %#v %v", rating, err)
	}
}

func TestRecentViewUpsertAndRetentionBound(t *testing.T) {
	repo := newMemoryRepository()
	targets := map[domain.Target]domain.ResolvedTarget{}
	now := time.Now().UTC()
	for i := 0; i < 51; i++ {
		target := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
		targets[target] = resolved(target, "Article", "", now)
		if _, err := NewService(repo, targetResolverStub{targets: targets, hidden: map[domain.Target]bool{}}, discoveryStub{}).RecordView(context.Background(), "user-a", target); err != nil {
			t.Fatal(err)
		}
	}
	if got := len(repo.viewsFor("user-a")); got != 50 {
		t.Fatalf("retained views=%d, want 50", got)
	}
	var repeated domain.Target
	for target := range targets {
		repeated = target
		break
	}
	service := NewService(repo, targetResolverStub{targets: targets, hidden: map[domain.Target]bool{}}, discoveryStub{})
	first, _ := service.RecordView(context.Background(), "user-b", repeated)
	second, _ := service.RecordView(context.Background(), "user-b", repeated)
	if first.ViewCount != 1 || second.ViewCount != 2 {
		t.Fatalf("view counts=%d,%d", first.ViewCount, second.ViewCount)
	}
}

func TestRecommendationsAreDeterministicExcludeSeedsAndHiddenCandidates(t *testing.T) {
	now := time.Date(2026, 8, 18, 0, 0, 0, 0, time.UTC)
	category := uuid.NewString()
	seed := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	first := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	second := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	hidden := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	targets := map[domain.Target]domain.ResolvedTarget{seed: resolved(seed, "Seed", category, now.Add(-48*time.Hour)), first: resolved(first, "First", category, now.Add(-2*time.Hour)), second: resolved(second, "Second", category, now.Add(-time.Hour))}
	repo := newMemoryRepository()
	service := NewService(repo, targetResolverStub{targets: targets, hidden: map[domain.Target]bool{hidden: true}}, discoveryStub{candidates: []domain.Candidate{{Target: seed}, {Target: second}, {Target: hidden}, {Target: first}}})
	service.now = func() time.Time { return now }
	if _, err := service.PutBookmark(context.Background(), "user-a", seed); err != nil {
		t.Fatal(err)
	}
	one, err := service.Recommendations(context.Background(), "user-a", 10)
	if err != nil {
		t.Fatal(err)
	}
	two, err := service.Recommendations(context.Background(), "user-a", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(one.Items) != 2 || len(two.Items) != 2 {
		t.Fatalf("recommendations=%#v %#v", one, two)
	}
	for i := range one.Items {
		if one.Items[i].Target.Target != two.Items[i].Target.Target {
			t.Fatalf("ordering changed: %#v %#v", one, two)
		}
		if one.Items[i].Target.Target == seed || one.Items[i].Target.Target == hidden {
			t.Fatalf("excluded candidate leaked: %#v", one.Items[i])
		}
	}
	if one.Items[0].Target.Target != second {
		t.Fatalf("newer deterministic tie-break lost: %#v", one.Items)
	}
}

func TestRecommendationFallbackAndSearchFailure(t *testing.T) {
	now := time.Now().UTC()
	candidate := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	resolver := targetResolverStub{targets: map[domain.Target]domain.ResolvedTarget{candidate: resolved(candidate, "Recent", "", now)}, hidden: map[domain.Target]bool{}}
	service := NewService(newMemoryRepository(), resolver, discoveryStub{candidates: []domain.Candidate{{Target: candidate}}})
	result, err := service.Recommendations(context.Background(), "user-a", 1)
	if err != nil {
		t.Fatal(err)
	}
	if result.Personalized || len(result.Items) != 1 || result.Items[0].Reason != domain.ReasonFallbackRecent {
		t.Fatalf("fallback=%#v", result)
	}
	failing := NewService(newMemoryRepository(), resolver, discoveryStub{err: errors.New("search down")})
	if _, err := failing.Recommendations(context.Background(), "user-a", 1); !errors.Is(err, domain.ErrRecommendationUnavailable) {
		t.Fatalf("search failure=%v", err)
	}
}

type stubPinProvider struct {
	pins []domain.ActivePin
}

func (p *stubPinProvider) ListActivePins(_ context.Context, _ string, limit int) ([]domain.ActivePin, error) {
	if len(p.pins) > limit {
		return p.pins[:limit], nil
	}
	return p.pins, nil
}

func TestPublicRecommendationsAndEditorialPins(t *testing.T) {
	now := time.Now().UTC()
	pinTarget := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	fallbackTarget := domain.Target{Type: domain.TargetKnowledge, ID: uuid.NewString()}
	resolver := targetResolverStub{
		targets: map[domain.Target]domain.ResolvedTarget{
			pinTarget:      resolved(pinTarget, "Pinned Content", "cat-1", now),
			fallbackTarget: resolved(fallbackTarget, "Fallback Content", "cat-2", now),
		},
		hidden: map[domain.Target]bool{},
	}
	pinProv := &stubPinProvider{
		pins: []domain.ActivePin{
			{TargetType: pinTarget.Type, TargetID: pinTarget.ID, Title: "Pinned Content", Weight: 100},
		},
	}
	service := NewService(newMemoryRepository(), resolver, discoveryStub{candidates: []domain.Candidate{{Target: fallbackTarget}}})
	service.SetPinProvider(pinProv)

	publicRes, err := service.PublicRecommendations(context.Background(), "", 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(publicRes.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(publicRes.Items))
	}
	if publicRes.Items[0].Reason != domain.ReasonEditorialPin {
		t.Fatalf("expected first item to be editorial_pin, got %s", publicRes.Items[0].Reason)
	}
	if publicRes.Items[1].Reason != domain.ReasonFallbackRecent {
		t.Fatalf("expected second item to be fallback_recent, got %s", publicRes.Items[1].Reason)
	}

	authRes, err := service.Recommendations(context.Background(), "user-b", 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(authRes.Items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(authRes.Items))
	}
	if authRes.Items[0].Reason != domain.ReasonEditorialPin {
		t.Fatalf("expected first item to be editorial_pin, got %s", authRes.Items[0].Reason)
	}
}

