package platformconfig

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"sync"
	"time"

	"teman-belajar-api/internal/domain/media"
	domain "teman-belajar-api/internal/domain/platformconfig"
)

var ErrInvalidMediaReference = errors.New("invalid platform configuration media reference")

type mediaReader interface {
	GetAssetByID(context.Context, string) (*media.MediaAsset, error)
}

type Service struct {
	repository domain.Repository
	media      mediaReader
	hosts      []string
	ttl        time.Duration
	mu         sync.RWMutex
	cached     domain.PublicSnapshot
	expiresAt  time.Time
}

func NewService(repository domain.Repository, mediaRepository mediaReader, externalHosts []string) *Service {
	return &Service{repository: repository, media: mediaRepository, hosts: externalHosts, ttl: 60 * time.Second}
}

func (service *Service) State(ctx context.Context) (domain.State, error) {
	return service.repository.GetState(ctx, true)
}

func (service *Service) Preview(ctx context.Context) (domain.PublicSnapshot, error) {
	state, err := service.repository.GetState(ctx, false)
	if err != nil {
		return domain.PublicSnapshot{}, err
	}
	if state.Draft != nil {
		return domain.PublicSnapshot{Version: state.Draft.Version, Source: "draft", Config: state.Draft.Config}, nil
	}
	if state.Published != nil {
		return domain.PublicSnapshot{Version: state.Published.Version, Source: "published", Config: state.Published.Config}, nil
	}
	return domain.PublicSnapshot{Source: "fallback", Config: domain.Default()}, nil
}

func (service *Service) Public(ctx context.Context) domain.PublicSnapshot {
	now := time.Now()
	service.mu.RLock()
	if now.Before(service.expiresAt) {
		snapshot := service.cached
		service.mu.RUnlock()
		return snapshot
	}
	service.mu.RUnlock()

	snapshot := domain.PublicSnapshot{Source: "fallback", Config: domain.Default()}
	revision, err := service.repository.GetPublished(ctx)
	if err == nil && revision != nil {
		snapshot = domain.PublicSnapshot{Version: revision.Version, Source: "published", Config: revision.Config}
	}
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		snapshot.Source = "fallback"
	}
	service.mu.Lock()
	service.cached, service.expiresAt = snapshot, now.Add(service.ttl)
	service.mu.Unlock()
	return snapshot
}

func (service *Service) SaveDraft(ctx context.Context, expectedVersion int64, config domain.Config, actor string) (*domain.Revision, error) {
	if strings.TrimSpace(actor) == "" || expectedVersion < 0 || domain.Validate(config, service.hosts) != nil {
		return nil, domain.ErrInvalidConfig
	}
	if err := service.validateMedia(ctx, config); err != nil {
		return nil, err
	}
	return service.repository.SaveDraft(ctx, expectedVersion, config, actor)
}

func (service *Service) Publish(ctx context.Context, version int64, actor string) (*domain.Revision, error) {
	if version < 1 || strings.TrimSpace(actor) == "" {
		return nil, domain.ErrInvalidConfig
	}
	revision, err := service.repository.Publish(ctx, version, actor)
	if err == nil {
		service.Invalidate()
	}
	return revision, err
}

func (service *Service) Rollback(ctx context.Context, sourceVersion, expectedVersion int64, actor string) (*domain.Revision, error) {
	if sourceVersion < 1 || expectedVersion < 1 || strings.TrimSpace(actor) == "" {
		return nil, domain.ErrInvalidConfig
	}
	revision, err := service.repository.Rollback(ctx, sourceVersion, expectedVersion, actor)
	if err == nil {
		service.Invalidate()
	}
	return revision, err
}

func (service *Service) Invalidate() {
	service.mu.Lock()
	service.expiresAt = time.Time{}
	service.cached = domain.PublicSnapshot{}
	service.mu.Unlock()
}

func (service *Service) validateMedia(ctx context.Context, config domain.Config) error {
	for _, id := range domain.MediaIDs(config) {
		asset, err := service.media.GetAssetByID(ctx, id)
		if err != nil || asset == nil || asset.Status != media.StatusActive || !strings.HasPrefix(asset.DetectedMimeType, "image/") {
			return ErrInvalidMediaReference
		}
	}
	return nil
}
