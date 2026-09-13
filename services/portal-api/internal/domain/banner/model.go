package banner

import (
	"errors"
	"time"
)

var (
	ErrValidation       = errors.New("banner validation failed")
	ErrNotFound         = errors.New("banner not found")
	ErrMaxActiveBanners = errors.New("maksimal 3 banner yang dapat aktif secara bersamaan")
)

type Banner struct {
	ID          string    `json:"id"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	ImageURL    string    `json:"image_url"`
	CTALabel    string    `json:"cta_label"`
	CTAHref     string    `json:"cta_href"`
	Align       string    `json:"align"`
	SortOrder   int       `json:"sort_order"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	CreatedBy   string    `json:"created_by"`
	UpdatedBy   string    `json:"updated_by"`
}

type CreateBannerInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	CTALabel    string `json:"cta_label"`
	CTAHref     string `json:"cta_href"`
	Align       string `json:"align"`
	SortOrder   int    `json:"sort_order"`
	IsActive    bool   `json:"is_active"`
}

type UpdateBannerInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	ImageURL    string `json:"image_url"`
	CTALabel    string `json:"cta_label"`
	CTAHref     string `json:"cta_href"`
	Align       string `json:"align"`
	SortOrder   int    `json:"sort_order"`
	IsActive    bool   `json:"is_active"`
}
