package knowledge

import (
	"errors"
	"time"
)

var (
	ErrInvalidStatusTransition = errors.New("invalid status transition")
	ErrArticleNotFound         = errors.New("article not found")
	ErrRevisionNotFound        = errors.New("revision not found")
)

type ArticleStatus string

const (
	StatusDraft     ArticleStatus = "draft"
	StatusInReview  ArticleStatus = "in_review"
	StatusApproved  ArticleStatus = "approved"
	StatusPublished ArticleStatus = "published"
	StatusArchived  ArticleStatus = "archived"
)

type Article struct {
	ID                  string
	Slug                string
	Title               string
	Summary             *string
	Status              ArticleStatus
	CategoryID          *string
	PublishedRevisionNo *int
	CurrentRevisionNo   int
	CreatedAt           time.Time
	CreatedBy           *string
	UpdatedAt           time.Time
	UpdatedBy           *string
	LastReviewedAt      *time.Time
}

type Revision struct {
	ID         string
	ArticleID  string
	RevisionNo int
	Body       string
	AuthorID   *string
	CreatedAt  time.Time
}

type RelatedArticle struct {
	ArticleID1 string
	ArticleID2 string
}

func (a *Article) CanTransitionTo(nextStatus ArticleStatus) bool {
	switch a.Status {
	case StatusDraft:
		return nextStatus == StatusInReview || nextStatus == StatusDraft || nextStatus == StatusArchived
	case StatusInReview:
		return nextStatus == StatusApproved || nextStatus == StatusDraft || nextStatus == StatusArchived
	case StatusApproved:
		return nextStatus == StatusPublished || nextStatus == StatusDraft || nextStatus == StatusArchived
	case StatusPublished:
		return nextStatus == StatusArchived || nextStatus == StatusDraft
	case StatusArchived:
		return nextStatus == StatusDraft // Allow un-archiving back to draft
	default:
		return false
	}
}

func (a *Article) TransitionTo(nextStatus ArticleStatus) error {
	if !a.CanTransitionTo(nextStatus) {
		return ErrInvalidStatusTransition
	}
	
	a.Status = nextStatus
	
	if nextStatus == StatusPublished {
		val := a.CurrentRevisionNo
		a.PublishedRevisionNo = &val
	}
	
	return nil
}
