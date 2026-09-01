package platformconfig

import (
	"context"
	"database/sql"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/media"
	domain "teman-belajar-api/internal/domain/platformconfig"
)

type fakeRepository struct {
	state     domain.State
	published *domain.Revision
	err       error
	saves     int
}

func (repository *fakeRepository) GetState(context.Context, bool) (domain.State, error) {
	return repository.state, repository.err
}
func (repository *fakeRepository) GetPublished(context.Context) (*domain.Revision, error) {
	if repository.err != nil {
		return nil, repository.err
	}
	if repository.published == nil {
		return nil, sql.ErrNoRows
	}
	return repository.published, nil
}
func (repository *fakeRepository) SaveDraft(_ context.Context, expected int64, config domain.Config, actor string) (*domain.Revision, error) {
	repository.saves++
	if expected != repository.state.HeadVersion {
		return nil, domain.ErrVersionConflict
	}
	return &domain.Revision{Version: expected + 1, Status: "draft", Config: config, CreatedBy: actor}, nil
}
func (repository *fakeRepository) Publish(_ context.Context, version int64, _ string) (*domain.Revision, error) {
	if repository.err != nil {
		return nil, repository.err
	}
	revision := &domain.Revision{Version: version, Status: "published", Config: domain.Default()}
	repository.published = revision
	return revision, nil
}
func (repository *fakeRepository) Rollback(_ context.Context, source, expected int64, _ string) (*domain.Revision, error) {
	return &domain.Revision{Version: expected + 1, Status: "published", BasedOnVersion: &source, Config: domain.Default()}, nil
}

type fakeMedia struct {
	asset *media.MediaAsset
	err   error
}

func (reader fakeMedia) GetAssetByID(context.Context, string) (*media.MediaAsset, error) {
	return reader.asset, reader.err
}

func TestPublicUsesFallbackAndPublishedCache(t *testing.T) {
	repository := &fakeRepository{err: errors.New("outage")}
	service := NewService(repository, fakeMedia{}, nil)
	if snapshot := service.Public(context.Background()); snapshot.Source != "fallback" || snapshot.Config.SEO.DefaultTitle != "Teman Belajar" {
		t.Fatalf("fallback=%#v", snapshot)
	}
	repository.err = nil
	repository.published = &domain.Revision{Version: 4, Config: domain.Default()}
	service.Invalidate()
	if snapshot := service.Public(context.Background()); snapshot.Source != "published" || snapshot.Version != 4 {
		t.Fatalf("published=%#v", snapshot)
	}
}

func TestSaveDraftValidatesMediaAndOptimisticVersion(t *testing.T) {
	repository := &fakeRepository{state: domain.State{HeadVersion: 2}}
	service := NewService(repository, fakeMedia{asset: &media.MediaAsset{Status: media.StatusActive, DetectedMimeType: "image/png"}}, nil)
	config := domain.Default()
	config.Identity.LogoMediaID = "10000000-0000-4000-8000-000000000020"
	if _, err := service.SaveDraft(context.Background(), 2, config, "administrator"); err != nil {
		t.Fatalf("save draft: %v", err)
	}
	service.media = fakeMedia{asset: &media.MediaAsset{Status: media.StatusArchived, DetectedMimeType: "image/png"}}
	if _, err := service.SaveDraft(context.Background(), 2, config, "administrator"); !errors.Is(err, ErrInvalidMediaReference) {
		t.Fatalf("archived media err=%v", err)
	}
	service.media = fakeMedia{asset: &media.MediaAsset{Status: media.StatusActive, DetectedMimeType: "application/pdf"}}
	if _, err := service.SaveDraft(context.Background(), 2, config, "administrator"); !errors.Is(err, ErrInvalidMediaReference) {
		t.Fatalf("document media err=%v", err)
	}
}

func TestPublishInvalidatesCachedSnapshot(t *testing.T) {
	repository := &fakeRepository{published: &domain.Revision{Version: 1, Config: domain.Default()}}
	service := NewService(repository, fakeMedia{}, nil)
	service.ttl = time.Hour
	if service.Public(context.Background()).Version != 1 {
		t.Fatal("expected initial version")
	}
	if _, err := service.Publish(context.Background(), 2, "administrator"); err != nil {
		t.Fatal(err)
	}
	if service.Public(context.Background()).Version != 2 {
		t.Fatal("cache was not invalidated")
	}
}
