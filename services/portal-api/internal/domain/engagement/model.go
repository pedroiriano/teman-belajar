package engagement

import (
	"errors"
	"time"
)

var (
	ErrInvalidActor              = errors.New("authenticated actor is required")
	ErrInvalidTarget             = errors.New("invalid engagement target")
	ErrTargetUnavailable         = errors.New("engagement target is unavailable")
	ErrInvalidRating             = errors.New("rating must be an integer from 1 to 5")
	ErrRecommendationUnavailable = errors.New("recommendations are temporarily unavailable")
)

type TargetType string

const (
	TargetKnowledge     TargetType = "knowledge"
	TargetMicrolearning TargetType = "microlearning"
)

type Target struct {
	Type TargetType
	ID   string
}

type ResolvedTarget struct {
	Target      Target
	Title       string
	Summary     string
	URL         string
	CategoryID  string
	Tags        []string
	PublishedAt *time.Time
}

type Bookmark struct {
	ID        string
	UserKey   string
	Target    Target
	CreatedAt time.Time
}

type Rating struct {
	ID        string
	UserKey   string
	Target    Target
	Value     int
	CreatedAt time.Time
	UpdatedAt time.Time
}

type RatingSummary struct {
	Average float64
	Count   int
}

type RecentView struct {
	ID            string
	UserKey       string
	Target        Target
	FirstViewedAt time.Time
	LastViewedAt  time.Time
	ViewCount     int64
}

type Item struct {
	Target     ResolvedTarget
	Bookmarked bool
	Rating     *int
	CreatedAt  *time.Time
	LastViewed *time.Time
	ViewCount  int64
}

type RecommendationReason string

const (
	ReasonSameCategory   RecommendationReason = "same_category"
	ReasonRecentInterest RecommendationReason = "recent_interest"
	ReasonPopularRating  RecommendationReason = "popular_rating"
	ReasonFallbackRecent RecommendationReason = "fallback_recent"
	ReasonEditorialPin   RecommendationReason = "editorial_pin"
)

type Recommendation struct {
	Target ResolvedTarget
	Reason RecommendationReason
	Score  int
}

type RecommendationResult struct {
	Items        []Recommendation
	Personalized bool
}

type CandidateQuery struct {
	Text       string
	TargetType TargetType
	CategoryID string
	Limit      int
	Newest     bool
}

type Candidate struct {
	Target      Target
	PublishedAt *time.Time
}
