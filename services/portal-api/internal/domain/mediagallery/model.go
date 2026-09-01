package mediagallery

import (
	"context"
	"errors"
	"regexp"
	"strings"
	"time"
	"unicode"
)

const (
	StatusDraft     = "draft"
	StatusInReview  = "in_review"
	StatusApproved  = "approved"
	StatusPublished = "published"
	StatusArchived  = "archived"
	KindImage       = "image_gallery"
	KindVideo       = "video_hub"
	MaxPayloadBytes = 131_072
)

var (
	ErrInvalidInput      = errors.New("invalid media collection input")
	ErrNotFound          = errors.New("media collection not found")
	ErrVersionConflict   = errors.New("media collection version conflict")
	ErrInvalidTransition = errors.New("invalid media collection transition")
	ErrInvalidMedia      = errors.New("invalid media collection asset")
	slugPattern          = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
)

type ItemInput struct {
	MediaID    string  `json:"media_id"`
	SortOrder  int     `json:"sort_order"`
	Featured   bool    `json:"featured"`
	Caption    *string `json:"caption,omitempty"`
	AltText    *string `json:"alt_text,omitempty"`
	Decorative bool    `json:"decorative"`
	Transcript *string `json:"transcript,omitempty"`
}

type Input struct {
	Slug           string      `json:"slug"`
	Title          string      `json:"title"`
	Summary        string      `json:"summary"`
	Kind           string      `json:"kind"`
	Featured       bool        `json:"featured"`
	SEOTitle       *string     `json:"seo_title,omitempty"`
	SEODescription *string     `json:"seo_description,omitempty"`
	Indexable      bool        `json:"indexable"`
	Items          []ItemInput `json:"items"`
}

type Item struct {
	ID              string  `json:"id"`
	MediaID         string  `json:"media_id"`
	SortOrder       int     `json:"sort_order"`
	Featured        bool    `json:"featured"`
	Caption         *string `json:"caption,omitempty"`
	AltText         *string `json:"alt_text,omitempty"`
	Decorative      bool    `json:"decorative"`
	Transcript      *string `json:"transcript,omitempty"`
	MimeType        string  `json:"mime_type"`
	DisplayFilename string  `json:"display_filename"`
}

type Collection struct {
	ID             string     `json:"id"`
	Slug           string     `json:"slug"`
	Title          string     `json:"title"`
	Summary        string     `json:"summary"`
	Kind           string     `json:"kind"`
	Status         string     `json:"status"`
	Featured       bool       `json:"featured"`
	SEOTitle       *string    `json:"seo_title,omitempty"`
	SEODescription *string    `json:"seo_description,omitempty"`
	Indexable      bool       `json:"indexable"`
	Version        int64      `json:"version"`
	PublishedAt    *time.Time `json:"published_at,omitempty"`
	UpdatedAt      time.Time  `json:"updated_at"`
	Items          []Item     `json:"items"`
}

type Filter struct {
	Page, PageSize      int
	Query, Kind, Status string
}

type Page struct {
	Data       []Collection `json:"data"`
	Page       int          `json:"page"`
	PageSize   int          `json:"page_size"`
	Total      int          `json:"total"`
	TotalPages int          `json:"total_pages"`
}

type Repository interface {
	Create(context.Context, Input, string) (*Collection, error)
	Update(context.Context, string, int64, Input, string) (*Collection, error)
	Transition(context.Context, string, int64, string, string) (*Collection, error)
	GetAdmin(context.Context, string) (*Collection, error)
	ListAdmin(context.Context, Filter) (Page, error)
	GetPublic(context.Context, string) (*Collection, error)
	ListPublic(context.Context, Filter) (Page, error)
}

func NormalizeFilter(filter Filter, public bool) (Filter, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.PageSize < 1 {
		filter.PageSize = 12
	}
	if filter.PageSize > 50 || len([]rune(filter.Query)) > 100 {
		return filter, ErrInvalidInput
	}
	filter.Query = strings.TrimSpace(filter.Query)
	if filter.Kind != "" && filter.Kind != KindImage && filter.Kind != KindVideo {
		return filter, ErrInvalidInput
	}
	if public {
		filter.Status = StatusPublished
	} else if filter.Status != "" && !validStatus(filter.Status) {
		return filter, ErrInvalidInput
	}
	return filter, nil
}

func ValidateInput(input Input) error {
	input.Slug = strings.TrimSpace(input.Slug)
	if len(input.Slug) < 3 || len(input.Slug) > 160 || !slugPattern.MatchString(input.Slug) || (input.Kind != KindImage && input.Kind != KindVideo) {
		return ErrInvalidInput
	}
	if invalidText(input.Title, 3, 200, true) || invalidText(input.Summary, 10, 1000, false) || len(input.Items) > 100 {
		return ErrInvalidInput
	}
	if input.SEOTitle != nil && invalidText(*input.SEOTitle, 0, 70, true) {
		return ErrInvalidInput
	}
	if input.SEODescription != nil && invalidText(*input.SEODescription, 0, 160, true) {
		return ErrInvalidInput
	}
	mediaIDs := map[string]bool{}
	orders := map[int]bool{}
	featured := 0
	for _, item := range input.Items {
		if item.MediaID == "" || len(item.MediaID) > 64 || item.SortOrder < 0 || item.SortOrder > 10000 || mediaIDs[item.MediaID] || orders[item.SortOrder] {
			return ErrInvalidInput
		}
		mediaIDs[item.MediaID], orders[item.SortOrder] = true, true
		if item.Featured {
			featured++
		}
		if featured > 1 || (item.Caption != nil && invalidText(*item.Caption, 0, 2000, false)) || (item.AltText != nil && invalidText(*item.AltText, 0, 255, true)) || (item.Transcript != nil && invalidText(*item.Transcript, 0, 20000, false)) {
			return ErrInvalidInput
		}
	}
	return nil
}

func CanTransition(from, to string) bool {
	switch from {
	case StatusDraft:
		return to == StatusInReview
	case StatusInReview:
		return to == StatusDraft || to == StatusApproved
	case StatusApproved:
		return to == StatusDraft || to == StatusPublished
	case StatusPublished:
		return to == StatusArchived
	default:
		return false
	}
}

func validStatus(value string) bool {
	return value == StatusDraft || value == StatusInReview || value == StatusApproved || value == StatusPublished || value == StatusArchived
}

func invalidText(value string, min, max int, singleLine bool) bool {
	value = strings.TrimSpace(value)
	size := len([]rune(value))
	if size < min || size > max || strings.ContainsAny(value, "<>") || (singleLine && strings.ContainsAny(value, "\r\n")) {
		return true
	}
	for _, r := range value {
		if unicode.IsControl(r) && (singleLine || (r != '\r' && r != '\n' && r != '\t')) {
			return true
		}
	}
	return false
}
