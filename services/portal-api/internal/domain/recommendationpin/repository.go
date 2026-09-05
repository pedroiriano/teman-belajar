package recommendationpin

import "context"

type Repository interface {
	List(ctx context.Context, targetType string, limit int) ([]RecommendationPin, error)
	Create(ctx context.Context, pin RecommendationPin) (*RecommendationPin, error)
	Delete(ctx context.Context, id string) error
}
