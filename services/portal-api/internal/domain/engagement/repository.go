package engagement

import "context"

type Repository interface {
	UpsertBookmark(ctx context.Context, userKey string, target Target) (Bookmark, error)
	DeleteBookmark(ctx context.Context, userKey string, target Target) error
	ListBookmarks(ctx context.Context, userKey string, limit int) ([]Bookmark, error)

	UpsertRating(ctx context.Context, userKey string, target Target, value int) (Rating, error)
	DeleteRating(ctx context.Context, userKey string, target Target) error
	GetRating(ctx context.Context, userKey string, target Target) (*Rating, error)
	ListRatings(ctx context.Context, userKey string, limit int) ([]Rating, error)
	GetRatingSummary(ctx context.Context, target Target) (RatingSummary, error)

	UpsertRecentView(ctx context.Context, userKey string, target Target, retentionLimit int) (RecentView, error)
	ListRecentViews(ctx context.Context, userKey string, limit int) ([]RecentView, error)
}

type TargetResolver interface {
	Resolve(ctx context.Context, target Target) (ResolvedTarget, error)
}

type CandidateDiscovery interface {
	Discover(ctx context.Context, query CandidateQuery) ([]Candidate, error)
}

type ActivePin struct {
	TargetType TargetType
	TargetID   string
	Title      string
	Weight     int
}

type PinProvider interface {
	ListActivePins(ctx context.Context, targetType string, limit int) ([]ActivePin, error)
}

