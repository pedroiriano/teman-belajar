package recommendationpin

import (
	"errors"
	"time"
)

var (
	ErrInvalidInput = errors.New("invalid recommendation pin input")
	ErrNotFound     = errors.New("recommendation pin not found")
)

type RecommendationPin struct {
	ID         string    `json:"id"`
	TargetType string    `json:"target_type"`
	TargetID   string    `json:"target_id"`
	Title      string    `json:"title"`
	Pinned     bool      `json:"pinned"`
	Weight     int       `json:"weight"`
	PinnedBy   string    `json:"pinned_by"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type CreatePinInput struct {
	TargetType string `json:"target_type"`
	TargetID   string `json:"target_id"`
	Title      string `json:"title"`
	Weight     int    `json:"weight"`
}
