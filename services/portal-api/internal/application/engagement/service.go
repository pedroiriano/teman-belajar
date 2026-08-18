package engagement

import (
	"context"
	"errors"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"

	domain "teman-belajar-api/internal/domain/engagement"
)

const (
	defaultListLimit      = 50
	recentViewRetention   = 50
	defaultRecommendation = 6
	maxRecommendation     = 20
)

type Service struct {
	repo      domain.Repository
	resolver  domain.TargetResolver
	discovery domain.CandidateDiscovery
	now       func() time.Time
}

func NewService(repo domain.Repository, resolver domain.TargetResolver, discovery domain.CandidateDiscovery) *Service {
	return &Service{repo: repo, resolver: resolver, discovery: discovery, now: func() time.Time { return time.Now().UTC() }}
}

func ParseTarget(targetType, targetID string) (domain.Target, error) {
	target := domain.Target{Type: domain.TargetType(strings.TrimSpace(targetType)), ID: strings.TrimSpace(targetID)}
	if target.Type != domain.TargetKnowledge {
		return domain.Target{}, domain.ErrInvalidTarget
	}
	parsed, err := uuid.Parse(target.ID)
	if err != nil {
		return domain.Target{}, domain.ErrInvalidTarget
	}
	target.ID = parsed.String()
	return target, nil
}

func actor(userKey string) (string, error) {
	userKey = strings.TrimSpace(userKey)
	if userKey == "" || len(userKey) > 255 {
		return "", domain.ErrInvalidActor
	}
	return userKey, nil
}

func (s *Service) resolve(ctx context.Context, target domain.Target) (domain.ResolvedTarget, error) {
	resolved, err := s.resolver.Resolve(ctx, target)
	if err != nil {
		if errors.Is(err, domain.ErrTargetUnavailable) || errors.Is(err, domain.ErrInvalidTarget) {
			return domain.ResolvedTarget{}, err
		}
		return domain.ResolvedTarget{}, domain.ErrTargetUnavailable
	}
	return resolved, nil
}

func (s *Service) PutBookmark(ctx context.Context, userKey string, target domain.Target) (domain.Item, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return domain.Item{}, err
	}
	resolved, err := s.resolve(ctx, target)
	if err != nil {
		return domain.Item{}, err
	}
	bookmark, err := s.repo.UpsertBookmark(ctx, userKey, target)
	if err != nil {
		return domain.Item{}, err
	}
	return domain.Item{Target: resolved, Bookmarked: true, CreatedAt: &bookmark.CreatedAt}, nil
}

func (s *Service) DeleteBookmark(ctx context.Context, userKey string, target domain.Target) error {
	userKey, err := actor(userKey)
	if err != nil {
		return err
	}
	return s.repo.DeleteBookmark(ctx, userKey, target)
}

func (s *Service) ListBookmarks(ctx context.Context, userKey string) ([]domain.Item, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.ListBookmarks(ctx, userKey, defaultListLimit)
	if err != nil {
		return nil, err
	}
	items := make([]domain.Item, 0, len(rows))
	for _, row := range rows {
		resolved, resolveErr := s.resolve(ctx, row.Target)
		if resolveErr != nil {
			continue
		}
		createdAt := row.CreatedAt
		items = append(items, domain.Item{Target: resolved, Bookmarked: true, CreatedAt: &createdAt})
	}
	return items, nil
}

func (s *Service) PutRating(ctx context.Context, userKey string, target domain.Target, value int) (domain.Item, domain.RatingSummary, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return domain.Item{}, domain.RatingSummary{}, err
	}
	if value < 1 || value > 5 {
		return domain.Item{}, domain.RatingSummary{}, domain.ErrInvalidRating
	}
	resolved, err := s.resolve(ctx, target)
	if err != nil {
		return domain.Item{}, domain.RatingSummary{}, err
	}
	rating, err := s.repo.UpsertRating(ctx, userKey, target, value)
	if err != nil {
		return domain.Item{}, domain.RatingSummary{}, err
	}
	summary, err := s.repo.GetRatingSummary(ctx, target)
	if err != nil {
		return domain.Item{}, domain.RatingSummary{}, err
	}
	return domain.Item{Target: resolved, Rating: &rating.Value}, summary, nil
}

func (s *Service) DeleteRating(ctx context.Context, userKey string, target domain.Target) error {
	userKey, err := actor(userKey)
	if err != nil {
		return err
	}
	return s.repo.DeleteRating(ctx, userKey, target)
}

func (s *Service) GetMyRating(ctx context.Context, userKey string, target domain.Target) (*domain.Rating, domain.RatingSummary, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return nil, domain.RatingSummary{}, err
	}
	if _, err := s.resolve(ctx, target); err != nil {
		return nil, domain.RatingSummary{}, err
	}
	rating, err := s.repo.GetRating(ctx, userKey, target)
	if err != nil {
		return nil, domain.RatingSummary{}, err
	}
	summary, err := s.repo.GetRatingSummary(ctx, target)
	return rating, summary, err
}

func (s *Service) GetRatingSummary(ctx context.Context, target domain.Target) (domain.RatingSummary, error) {
	if _, err := s.resolve(ctx, target); err != nil {
		return domain.RatingSummary{}, err
	}
	return s.repo.GetRatingSummary(ctx, target)
}

func (s *Service) RecordView(ctx context.Context, userKey string, target domain.Target) (domain.Item, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return domain.Item{}, err
	}
	resolved, err := s.resolve(ctx, target)
	if err != nil {
		return domain.Item{}, err
	}
	view, err := s.repo.UpsertRecentView(ctx, userKey, target, recentViewRetention)
	if err != nil {
		return domain.Item{}, err
	}
	lastViewed := view.LastViewedAt
	return domain.Item{Target: resolved, LastViewed: &lastViewed, ViewCount: view.ViewCount}, nil
}

func (s *Service) ListRecentViews(ctx context.Context, userKey string) ([]domain.Item, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return nil, err
	}
	rows, err := s.repo.ListRecentViews(ctx, userKey, defaultListLimit)
	if err != nil {
		return nil, err
	}
	items := make([]domain.Item, 0, len(rows))
	for _, row := range rows {
		resolved, resolveErr := s.resolve(ctx, row.Target)
		if resolveErr != nil {
			continue
		}
		lastViewed := row.LastViewedAt
		items = append(items, domain.Item{Target: resolved, LastViewed: &lastViewed, ViewCount: row.ViewCount})
	}
	return items, nil
}

type recommendationSignal struct {
	target domain.ResolvedTarget
	weight int
	reason domain.RecommendationReason
}

func (s *Service) Recommendations(ctx context.Context, userKey string, limit int) (domain.RecommendationResult, error) {
	userKey, err := actor(userKey)
	if err != nil {
		return domain.RecommendationResult{}, err
	}
	if limit == 0 {
		limit = defaultRecommendation
	}
	if limit < 1 || limit > maxRecommendation {
		return domain.RecommendationResult{}, domain.ErrInvalidTarget
	}
	if s.discovery == nil {
		return domain.RecommendationResult{}, domain.ErrRecommendationUnavailable
	}

	bookmarks, err := s.repo.ListBookmarks(ctx, userKey, defaultListLimit)
	if err != nil {
		return domain.RecommendationResult{}, err
	}
	recent, err := s.repo.ListRecentViews(ctx, userKey, defaultListLimit)
	if err != nil {
		return domain.RecommendationResult{}, err
	}
	ratings, err := s.repo.ListRatings(ctx, userKey, defaultListLimit)
	if err != nil {
		return domain.RecommendationResult{}, err
	}

	seedIDs := map[domain.Target]struct{}{}
	signals := make([]recommendationSignal, 0, len(bookmarks)+len(recent)+len(ratings))
	for _, bookmark := range bookmarks {
		seedIDs[bookmark.Target] = struct{}{}
		if resolved, resolveErr := s.resolve(ctx, bookmark.Target); resolveErr == nil {
			signals = append(signals, recommendationSignal{target: resolved, weight: 40, reason: domain.ReasonSameCategory})
		}
	}
	for _, view := range recent {
		seedIDs[view.Target] = struct{}{}
		if resolved, resolveErr := s.resolve(ctx, view.Target); resolveErr == nil {
			signals = append(signals, recommendationSignal{target: resolved, weight: 25, reason: domain.ReasonRecentInterest})
		}
	}
	for _, rating := range ratings {
		seedIDs[rating.Target] = struct{}{}
		if rating.Value < 4 {
			continue
		}
		if resolved, resolveErr := s.resolve(ctx, rating.Target); resolveErr == nil {
			signals = append(signals, recommendationSignal{target: resolved, weight: 25 + rating.Value*5, reason: domain.ReasonPopularRating})
		}
	}

	if len(signals) == 0 {
		candidates, discoverErr := s.discovery.Discover(ctx, domain.CandidateQuery{TargetType: domain.TargetKnowledge, Limit: limit, Newest: true})
		if discoverErr != nil {
			return domain.RecommendationResult{}, domain.ErrRecommendationUnavailable
		}
		items := s.rankCandidates(ctx, candidates, nil, seedIDs, limit)
		for i := range items {
			items[i].Reason = domain.ReasonFallbackRecent
		}
		return domain.RecommendationResult{Items: items, Personalized: false}, nil
	}

	candidates := make([]domain.Candidate, 0, len(signals)*limit)
	for _, signal := range signals {
		discovered, discoverErr := s.discovery.Discover(ctx, domain.CandidateQuery{TargetType: signal.target.Target.Type, CategoryID: signal.target.CategoryID, Limit: limit * 2, Newest: true})
		if discoverErr != nil {
			return domain.RecommendationResult{}, domain.ErrRecommendationUnavailable
		}
		candidates = append(candidates, discovered...)
	}
	return domain.RecommendationResult{Items: s.rankCandidates(ctx, candidates, signals, seedIDs, limit), Personalized: true}, nil
}

func (s *Service) rankCandidates(ctx context.Context, candidates []domain.Candidate, signals []recommendationSignal, seedIDs map[domain.Target]struct{}, limit int) []domain.Recommendation {
	byTarget := map[domain.Target]domain.Recommendation{}
	for _, candidate := range candidates {
		if _, seeded := seedIDs[candidate.Target]; seeded {
			continue
		}
		resolved, err := s.resolve(ctx, candidate.Target)
		if err != nil {
			continue
		}
		score := 0
		reason := domain.ReasonFallbackRecent
		for _, signal := range signals {
			candidateScore := 0
			if signal.target.Target.Type == resolved.Target.Type {
				candidateScore = signal.weight / 2
			}
			if signal.target.CategoryID != "" && signal.target.CategoryID == resolved.CategoryID {
				candidateScore = signal.weight
			}
			if candidateScore > score {
				score = candidateScore
				reason = signal.reason
			}
		}
		published := candidate.PublishedAt
		if published == nil {
			published = resolved.PublishedAt
		}
		now := s.now()
		if published != nil && !published.After(now) && now.Sub(*published) <= 30*24*time.Hour {
			score += 10
		}
		current, exists := byTarget[candidate.Target]
		if !exists || score > current.Score {
			byTarget[candidate.Target] = domain.Recommendation{Target: resolved, Reason: reason, Score: score}
		}
	}
	items := make([]domain.Recommendation, 0, len(byTarget))
	for _, item := range byTarget {
		items = append(items, item)
	}
	sort.Slice(items, func(i, j int) bool {
		if items[i].Score != items[j].Score {
			return items[i].Score > items[j].Score
		}
		left, right := items[i].Target.PublishedAt, items[j].Target.PublishedAt
		if left != nil && right != nil && !left.Equal(*right) {
			return left.After(*right)
		}
		if items[i].Target.Target.Type != items[j].Target.Target.Type {
			return items[i].Target.Target.Type < items[j].Target.Target.Type
		}
		return items[i].Target.Target.ID < items[j].Target.Target.ID
	})
	if len(items) > limit {
		items = items[:limit]
	}
	return items
}
