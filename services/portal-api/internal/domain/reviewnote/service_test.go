package reviewnote

import (
	"context"
	"testing"
)

type mockReviewNoteRepo struct {
	notes []ReviewNote
}

func (m *mockReviewNoteRepo) ListByEntity(ctx context.Context, entityType string, entityID string, limit int) ([]ReviewNote, error) {
	var matched []ReviewNote
	for _, n := range m.notes {
		if n.EntityType == entityType && n.EntityID == entityID {
			matched = append(matched, n)
		}
	}
	return matched, nil
}

func (m *mockReviewNoteRepo) Create(ctx context.Context, note ReviewNote) (*ReviewNote, error) {
	note.ID = "note-1"
	m.notes = append(m.notes, note)
	return &note, nil
}

func TestReviewNoteService_CreateAndList(t *testing.T) {
	repo := &mockReviewNoteRepo{}
	svc := NewService(repo)
	ctx := context.Background()

	// 1. Validation error on empty notes
	_, err := svc.Create(ctx, CreateReviewNoteInput{
		EntityType: "knowledge",
		EntityID:   "k-1",
		Notes:      "",
	})
	if err == nil {
		t.Fatalf("expected error on empty notes, got nil")
	}

	// 2. Success create
	created, err := svc.Create(ctx, CreateReviewNoteInput{
		EntityType:   "Knowledge",
		EntityID:     "k-1",
		Action:       "request_changes",
		Notes:        "Tambahkan contoh kasus di paragraf 3.",
		ReviewerName: "Dewi Peninjau",
	})
	if err != nil {
		t.Fatalf("create failed: %v", err)
	}
	if created.EntityType != "knowledge" {
		t.Fatalf("expected normalized entity_type knowledge, got %s", created.EntityType)
	}

	// 3. List
	notes, err := svc.ListByEntity(ctx, "knowledge", "k-1", 10)
	if err != nil {
		t.Fatalf("list failed: %v", err)
	}
	if len(notes) != 1 {
		t.Fatalf("expected 1 note, got %d", len(notes))
	}
}
