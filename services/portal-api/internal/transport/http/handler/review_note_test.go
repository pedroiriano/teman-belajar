package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/reviewnote"
)

type mockReviewNoteRepo struct {
	notes []reviewnote.ReviewNote
}

func (m *mockReviewNoteRepo) ListByEntity(ctx context.Context, entityType string, entityID string, limit int) ([]reviewnote.ReviewNote, error) {
	var matched []reviewnote.ReviewNote
	for _, n := range m.notes {
		if n.EntityType == entityType && n.EntityID == entityID {
			matched = append(matched, n)
		}
	}
	return matched, nil
}

func (m *mockReviewNoteRepo) Create(ctx context.Context, note reviewnote.ReviewNote) (*reviewnote.ReviewNote, error) {
	note.ID = "test-note-1"
	m.notes = append(m.notes, note)
	return &note, nil
}

func TestReviewNoteHandler_CreateAndList(t *testing.T) {
	repo := &mockReviewNoteRepo{}
	svc := reviewnote.NewService(repo)
	h := NewReviewNoteHandler(svc)

	body, _ := json.Marshal(reviewnote.CreateReviewNoteInput{
		EntityType:   "knowledge",
		EntityID:     "art-123",
		Action:       "request_changes",
		Notes:        "Mohon perbaiki bagian referensi undang-undang.",
		ReviewerName: "Budi Peninjau",
	})
	createReq := httptest.NewRequest("POST", "/api/v1/admin/review-notes", bytes.NewReader(body))
	w1 := httptest.NewRecorder()
	h.Create(w1, createReq)

	if w1.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w1.Code, w1.Body.String())
	}

	listReq := httptest.NewRequest("GET", "/api/v1/admin/review-notes/knowledge/art-123", nil)
	listReq.SetPathValue("entityType", "knowledge")
	listReq.SetPathValue("entityId", "art-123")
	w2 := httptest.NewRecorder()
	h.List(w2, listReq)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}
}
