package draft

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
)

type memoryRepository struct{ items map[string]*FormDraft }

func newMemoryRepository() *memoryRepository {
	return &memoryRepository{items: map[string]*FormDraft{}}
}

func memoryKey(actor, key string) string { return actor + ":" + key }

func cloneDraft(value *FormDraft) *FormDraft {
	if value == nil {
		return nil
	}
	copyValue := *value
	copyValue.Payload = append(json.RawMessage(nil), value.Payload...)
	return &copyValue
}

func (r *memoryRepository) Create(_ context.Context, value *FormDraft) error {
	key := memoryKey(value.ActorSubject, value.DraftKey)
	if _, exists := r.items[key]; exists {
		return ErrConflict
	}
	r.items[key] = cloneDraft(value)
	return nil
}

func (r *memoryRepository) Update(_ context.Context, value *FormDraft, expectedRevision int64) error {
	key := memoryKey(value.ActorSubject, value.DraftKey)
	current := r.items[key]
	if current == nil || current.Revision != expectedRevision {
		return ErrConflict
	}
	r.items[key] = cloneDraft(value)
	return nil
}

func (r *memoryRepository) Get(_ context.Context, actor, key string) (*FormDraft, error) {
	value := r.items[memoryKey(actor, key)]
	if value == nil {
		return nil, ErrNotFound
	}
	return cloneDraft(value), nil
}

func (r *memoryRepository) GetByEntity(_ context.Context, actor, entityType, entityID string) (*FormDraft, error) {
	for _, value := range r.items {
		if value.ActorSubject == actor && value.EntityType == entityType && value.EntityID != nil && *value.EntityID == entityID {
			return cloneDraft(value), nil
		}
	}
	return nil, ErrNotFound
}

func (r *memoryRepository) List(_ context.Context, actor string, filter ListFilter) ([]FormDraft, error) {
	result := []FormDraft{}
	for _, value := range r.items {
		if value.ActorSubject == actor && value.FormKey == filter.FormKey {
			result = append(result, *cloneDraft(value))
		}
	}
	return result, nil
}

func (r *memoryRepository) Delete(_ context.Context, actor, key string) error {
	mapKey := memoryKey(actor, key)
	if r.items[mapKey] == nil {
		return ErrNotFound
	}
	delete(r.items, mapKey)
	return nil
}

func (r *memoryRepository) CleanupExpired(_ context.Context, limit int) (int64, error) { return 0, nil }

func validInput(key string) SaveInput {
	return SaveInput{
		DraftKey: key, FormKey: "news.create", EntityType: "news", SchemaVersion: 1,
		Payload:          json.RawMessage(`{"title":"Judul","slug":"judul","excerpt":"","body":"Isi","media_asset_ids":[]}`),
		ExpectedRevision: 0, ClientUpdatedAt: time.Date(2026, 8, 24, 8, 0, 0, 0, time.UTC),
	}
}

func TestServiceSupportsMultipleCreateDraftsAndOptimisticConflict(t *testing.T) {
	repo := newMemoryRepository()
	service := NewService(repo, nil, 30)
	now := time.Date(2026, 8, 24, 8, 1, 0, 0, time.UTC)
	service.now = func() time.Time { return now }
	actor := uuid.NewString()
	firstInput := validInput(uuid.NewString())
	first, err := service.Save(context.Background(), actor, firstInput)
	if err != nil || first.Revision != 1 {
		t.Fatalf("first save revision=%v err=%v", first, err)
	}
	second, err := service.Save(context.Background(), actor, validInput(uuid.NewString()))
	if err != nil || second.DraftKey == first.DraftKey {
		t.Fatalf("second create draft failed: value=%v err=%v", second, err)
	}

	stale := firstInput
	stale.ExpectedRevision = 0
	if _, err := service.Save(context.Background(), actor, stale); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected conflict, got %v", err)
	}
	update := firstInput
	update.ExpectedRevision = 1
	update.ClientUpdatedAt = now.Add(time.Minute)
	updated, err := service.Save(context.Background(), actor, update)
	if err != nil || updated.Revision != 2 {
		t.Fatalf("update revision=%v err=%v", updated, err)
	}
}

func TestServiceLocksEditIdentityToOneDraft(t *testing.T) {
	repo := newMemoryRepository()
	service := NewService(repo, nil, 30)
	now := time.Date(2026, 8, 24, 8, 1, 0, 0, time.UTC)
	service.now = func() time.Time { return now }
	actor, entity := uuid.NewString(), uuid.NewString()
	input := SaveInput{DraftKey: uuid.NewString(), FormKey: "knowledge.edit", EntityType: "knowledge", EntityID: &entity, SchemaVersion: 1, Payload: json.RawMessage(`{"body":"Edit","media_asset_ids":[]}`), ClientUpdatedAt: now}
	first, err := service.Save(context.Background(), actor, input)
	if err != nil {
		t.Fatal(err)
	}
	input.DraftKey = uuid.NewString()
	current, err := service.Save(context.Background(), actor, input)
	if !errors.Is(err, ErrConflict) || current == nil || current.DraftKey != first.DraftKey {
		t.Fatalf("expected existing edit draft conflict, current=%v err=%v", current, err)
	}
}

func TestPayloadRegistryRejectsUnknownSensitiveAndCredentialBearingData(t *testing.T) {
	base := validInput(uuid.NewString())
	tests := []json.RawMessage{
		json.RawMessage(`{"title":"x","slug":"x","excerpt":"","body":"x","password":"no"}`),
		json.RawMessage(`{"title":"x","slug":"x","excerpt":"","body":"x","unexpected":"no"}`),
		json.RawMessage(`{"title":"x","slug":"x","excerpt":"","body":"https://storage.invalid/a?X-Amz-Signature=secret","media_asset_ids":[]}`),
		json.RawMessage(`{"title":"x","slug":"x","excerpt":"","body":{"binary":true},"media_asset_ids":[]}`),
	}
	for index, payload := range tests {
		candidate := base
		candidate.Payload = payload
		if _, err := validatePayload(candidate); !errors.Is(err, ErrValidation) {
			t.Errorf("case %d expected validation error, got %v", index, err)
		}
	}
}

func TestRetentionDefaultsAndIsBounded(t *testing.T) {
	repo := newMemoryRepository()
	service := NewService(repo, nil, 0)
	now := time.Date(2026, 8, 24, 8, 1, 0, 0, time.UTC)
	service.now = func() time.Time { return now }
	created, err := service.Save(context.Background(), uuid.NewString(), validInput(uuid.NewString()))
	if err != nil {
		t.Fatal(err)
	}
	if want := now.Add(30 * 24 * time.Hour); !created.ExpiresAt.Equal(want) {
		t.Fatalf("expiry=%s want=%s", created.ExpiresAt, want)
	}
}
