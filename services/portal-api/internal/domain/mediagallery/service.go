package mediagallery

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/media"
)

var ErrForbidden = errors.New("media collection operation forbidden")

type mediaReader interface {
	GetAssetByID(context.Context, string) (*media.MediaAsset, error)
}
type cachedPage struct {
	value     Page
	expiresAt time.Time
}
type cachedCollection struct {
	value     *Collection
	expiresAt time.Time
}

type Service struct {
	repository Repository
	media      mediaReader
	audit      audit.Repository
	now        func() time.Time
	mu         sync.RWMutex
	pages      map[string]cachedPage
	details    map[string]cachedCollection
}

func NewService(repository Repository, mediaRepository mediaReader, auditRepository audit.Repository) *Service {
	return &Service{repository: repository, media: mediaRepository, audit: auditRepository, now: func() time.Time { return time.Now().UTC() }, pages: map[string]cachedPage{}, details: map[string]cachedCollection{}}
}

func (s *Service) Create(ctx context.Context, input Input, roles []string, actor string) (*Collection, error) {
	if !canWrite(roles) || strings.TrimSpace(actor) == "" {
		return nil, ErrForbidden
	}
	input = normalizeInput(input)
	if err := ValidateInput(input); err != nil {
		return nil, err
	}
	if err := s.validateAssets(ctx, input); err != nil {
		return nil, err
	}
	collection, err := s.repository.Create(ctx, input, actor)
	if err == nil {
		s.invalidate()
		s.record(ctx, actor, "MEDIA_COLLECTION_CREATED", collection.ID, "SUCCESS")
	}
	return collection, err
}

func (s *Service) Update(ctx context.Context, id string, expectedVersion int64, input Input, roles []string, actor string) (*Collection, error) {
	if !canWrite(roles) || strings.TrimSpace(actor) == "" {
		return nil, ErrForbidden
	}
	if _, err := uuid.Parse(id); err != nil || expectedVersion < 1 {
		return nil, ErrInvalidInput
	}
	input = normalizeInput(input)
	if err := ValidateInput(input); err != nil {
		return nil, err
	}
	current, err := s.repository.GetAdmin(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.Status != StatusDraft {
		return nil, ErrForbidden
	}
	if current.Version != expectedVersion {
		return nil, ErrVersionConflict
	}
	if err := s.validateAssets(ctx, input); err != nil {
		return nil, err
	}
	collection, err := s.repository.Update(ctx, id, expectedVersion, input, actor)
	if err == nil {
		s.invalidate()
		s.record(ctx, actor, "MEDIA_COLLECTION_UPDATED", id, "SUCCESS")
	}
	return collection, err
}

func (s *Service) Transition(ctx context.Context, id string, expectedVersion int64, next string, roles []string, actor string) (*Collection, error) {
	if _, err := uuid.Parse(id); err != nil || expectedVersion < 1 || strings.TrimSpace(actor) == "" {
		return nil, ErrInvalidInput
	}
	current, err := s.repository.GetAdmin(ctx, id)
	if err != nil {
		return nil, err
	}
	if current.Version != expectedVersion {
		return nil, ErrVersionConflict
	}
	if !CanTransition(current.Status, next) || !canTransition(current.Status, next, roles) {
		return nil, ErrInvalidTransition
	}
	if next == StatusPublished {
		input := Input{Slug: current.Slug, Title: current.Title, Summary: current.Summary, Kind: current.Kind, Featured: current.Featured, SEOTitle: current.SEOTitle, SEODescription: current.SEODescription, Indexable: current.Indexable}
		for _, item := range current.Items {
			input.Items = append(input.Items, ItemInput{MediaID: item.MediaID, SortOrder: item.SortOrder, Featured: item.Featured, Caption: item.Caption, AltText: item.AltText, Decorative: item.Decorative, Transcript: item.Transcript})
		}
		if len(input.Items) == 0 || s.validateAssets(ctx, input) != nil {
			return nil, ErrInvalidMedia
		}
	}
	collection, err := s.repository.Transition(ctx, id, expectedVersion, next, actor)
	if err == nil {
		s.invalidate()
		s.record(ctx, actor, "MEDIA_COLLECTION_TRANSITION_"+strings.ToUpper(next), id, "SUCCESS")
	}
	return collection, err
}

func (s *Service) GetAdmin(ctx context.Context, id string, roles []string) (*Collection, error) {
	if !canRead(roles) {
		return nil, ErrForbidden
	}
	if _, err := uuid.Parse(id); err != nil {
		return nil, ErrInvalidInput
	}
	return s.repository.GetAdmin(ctx, id)
}

func (s *Service) ListAdmin(ctx context.Context, filter Filter, roles []string) (Page, error) {
	if !canRead(roles) {
		return Page{}, ErrForbidden
	}
	filter, err := NormalizeFilter(filter, false)
	if err != nil {
		return Page{}, err
	}
	return s.repository.ListAdmin(ctx, filter)
}

func (s *Service) GetPublic(ctx context.Context, slug string) (*Collection, error) {
	if !slugPattern.MatchString(slug) {
		return nil, ErrNotFound
	}
	now := s.now()
	s.mu.RLock()
	cached, ok := s.details[slug]
	s.mu.RUnlock()
	if ok && now.Before(cached.expiresAt) {
		return cached.value, nil
	}
	collection, err := s.repository.GetPublic(ctx, slug)
	if err != nil {
		return nil, err
	}
	s.mu.Lock()
	s.details[slug] = cachedCollection{value: collection, expiresAt: now.Add(30 * time.Second)}
	s.mu.Unlock()
	return collection, nil
}

func (s *Service) ListPublic(ctx context.Context, filter Filter) (Page, error) {
	filter, err := NormalizeFilter(filter, true)
	if err != nil {
		return Page{}, err
	}
	key := fmt.Sprintf("%d:%d:%s:%s", filter.Page, filter.PageSize, filter.Query, filter.Kind)
	now := s.now()
	s.mu.RLock()
	cached, ok := s.pages[key]
	s.mu.RUnlock()
	if ok && now.Before(cached.expiresAt) {
		return cached.value, nil
	}
	page, err := s.repository.ListPublic(ctx, filter)
	if err != nil {
		return Page{}, err
	}
	s.mu.Lock()
	s.pages[key] = cachedPage{value: page, expiresAt: now.Add(30 * time.Second)}
	s.mu.Unlock()
	return page, nil
}

func (s *Service) invalidate() {
	s.mu.Lock()
	s.pages = map[string]cachedPage{}
	s.details = map[string]cachedCollection{}
	s.mu.Unlock()
}

func (s *Service) validateAssets(ctx context.Context, input Input) error {
	if s.media == nil {
		return ErrInvalidMedia
	}
	for _, item := range input.Items {
		if _, err := uuid.Parse(item.MediaID); err != nil {
			return ErrInvalidMedia
		}
		asset, err := s.media.GetAssetByID(ctx, item.MediaID)
		if err != nil || asset == nil || asset.Status != media.StatusActive {
			return ErrInvalidMedia
		}
		isImage, isVideo := strings.HasPrefix(asset.DetectedMimeType, "image/"), strings.HasPrefix(asset.DetectedMimeType, "video/")
		if input.Kind == KindImage {
			if !isImage || (!item.Decorative && (item.AltText == nil || strings.TrimSpace(*item.AltText) == "")) || (item.Decorative && item.AltText != nil && strings.TrimSpace(*item.AltText) != "") || item.Transcript != nil {
				return ErrInvalidMedia
			}
		} else if !isVideo || item.Decorative || item.Transcript == nil || strings.TrimSpace(*item.Transcript) == "" {
			return ErrInvalidMedia
		}
	}
	return nil
}

func normalizeInput(input Input) Input {
	input.Slug, input.Title, input.Summary = strings.TrimSpace(input.Slug), strings.Join(strings.Fields(input.Title), " "), strings.TrimSpace(input.Summary)
	normalizeOptional(&input.SEOTitle)
	normalizeOptional(&input.SEODescription)
	for index := range input.Items {
		normalizeOptional(&input.Items[index].Caption)
		normalizeOptional(&input.Items[index].AltText)
		normalizeOptional(&input.Items[index].Transcript)
	}
	return input
}

func normalizeOptional(value **string) {
	if *value == nil {
		return
	}
	normalized := strings.TrimSpace(**value)
	if normalized == "" {
		*value = nil
		return
	}
	*value = &normalized
}

func hasRole(roles []string, wanted string) bool {
	for _, role := range roles {
		if role == wanted || role == "Portal Administrator" {
			return true
		}
	}
	return false
}
func canRead(roles []string) bool {
	return hasRole(roles, "Content Editor") || hasRole(roles, "Reviewer")
}
func canWrite(roles []string) bool { return hasRole(roles, "Content Editor") }
func canTransition(from, to string, roles []string) bool {
	if from == StatusDraft {
		return to == StatusInReview && canWrite(roles)
	}
	if from == StatusInReview || from == StatusApproved {
		return hasRole(roles, "Reviewer")
	}
	return from == StatusPublished && to == StatusArchived && canRead(roles)
}

func (s *Service) record(ctx context.Context, actor, action, target, result string) {
	if s.audit == nil {
		return
	}
	_ = s.audit.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, Module: "media_gallery", TargetType: "media_collection", TargetID: target, Result: result, OccurredAt: s.now()})
}
