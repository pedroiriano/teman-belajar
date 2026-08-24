package postgres

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/draft"
)

func TestDraftRepositoryOwnerIsolationConflictAndCleanup(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	var tableExists bool
	if err := db.QueryRow(`SELECT to_regclass('public.form_drafts') IS NOT NULL`).Scan(&tableExists); err != nil || !tableExists {
		t.Skip("migration 014 is not available in the integration database")
	}
	repo := NewDraftRepository(db)
	ctx := context.Background()
	actor := uuid.NewString()
	otherActor := uuid.NewString()
	key := uuid.NewString()
	now := time.Now().UTC()
	value := &draft.FormDraft{
		ID: uuid.NewString(), ActorSubject: actor, DraftKey: key, FormKey: "news.create", EntityType: "news", SchemaVersion: 1,
		Payload: json.RawMessage(`{"title":"A"}`), Revision: 1, ClientUpdatedAt: now, ExpiresAt: now.Add(time.Hour), CreatedAt: now, UpdatedAt: now,
	}
	if err := repo.Create(ctx, value); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM form_drafts WHERE id=$1`, value.ID) })
	if _, err := repo.Get(ctx, otherActor, key); !errors.Is(err, draft.ErrNotFound) {
		t.Fatalf("other owner received draft or existence signal: %v", err)
	}
	value.Payload = json.RawMessage(`{"title":"B"}`)
	value.Revision = 2
	if err := repo.Update(ctx, value, 0); !errors.Is(err, draft.ErrConflict) {
		t.Fatalf("expected optimistic conflict, got %v", err)
	}
	if err := repo.Update(ctx, value, 1); err != nil {
		t.Fatal(err)
	}
	loaded, err := repo.Get(ctx, actor, key)
	if err != nil || loaded.Revision != 2 {
		t.Fatalf("revision=%v err=%v", loaded, err)
	}
	listed, err := repo.List(ctx, actor, draft.ListFilter{FormKey: "news.create", EntityType: "news"})
	if err != nil || len(listed) != 1 || listed[0].DraftKey != key {
		t.Fatalf("owner list=%v err=%v", listed, err)
	}
	isolated, err := repo.List(ctx, otherActor, draft.ListFilter{FormKey: "news.create", EntityType: "news"})
	if err != nil || len(isolated) != 0 {
		t.Fatalf("other owner list=%v err=%v", isolated, err)
	}
	entityID := uuid.NewString()
	edit := &draft.FormDraft{
		ID: uuid.NewString(), ActorSubject: actor, DraftKey: uuid.NewString(), FormKey: "news.edit", EntityType: "news", EntityID: &entityID, SchemaVersion: 1,
		Payload: json.RawMessage(`{"title":"Edit"}`), Revision: 1, ClientUpdatedAt: now, ExpiresAt: now.Add(time.Hour), CreatedAt: now, UpdatedAt: now,
	}
	if err := repo.Create(ctx, edit); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM form_drafts WHERE id=$1`, edit.ID) })
	filtered, err := repo.List(ctx, actor, draft.ListFilter{FormKey: "news.edit", EntityType: "news", EntityID: &entityID})
	if err != nil || len(filtered) != 1 || filtered[0].DraftKey != edit.DraftKey {
		t.Fatalf("entity list=%v err=%v", filtered, err)
	}

	expired := &draft.FormDraft{ID: uuid.NewString(), ActorSubject: actor, DraftKey: uuid.NewString(), FormKey: "news.create", EntityType: "news", SchemaVersion: 1, Payload: json.RawMessage(`{}`), Revision: 1, ClientUpdatedAt: now, ExpiresAt: now.Add(-time.Minute), CreatedAt: now, UpdatedAt: now}
	if err := repo.Create(ctx, expired); err != nil {
		t.Fatal(err)
	}
	removed, err := repo.CleanupExpired(ctx, 1)
	if err != nil || removed != 1 {
		t.Fatalf("cleanup removed=%d err=%v", removed, err)
	}
}
