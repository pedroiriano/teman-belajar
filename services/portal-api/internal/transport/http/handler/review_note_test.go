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

func TestReviewNoteHandler_ValidationErrors(t *testing.T) {
	repo := &mockReviewNoteRepo{}
	svc := reviewnote.NewService(repo)
	h := NewReviewNoteHandler(svc)

	// 1. Invalid JSON
	reqInvalidJSON := httptest.NewRequest("POST", "/api/v1/admin/review-notes", bytes.NewReader([]byte("{invalid-json")))
	w1 := httptest.NewRecorder()
	h.Create(w1, reqInvalidJSON)
	if w1.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid JSON, got %d", w1.Code)
	}

	// 2. Empty notes
	emptyNotesBody, _ := json.Marshal(reviewnote.CreateReviewNoteInput{
		EntityType:   "news",
		EntityID:     "news-123",
		Notes:        "   ",
		ReviewerName: "Reviewer",
	})
	reqEmptyNotes := httptest.NewRequest("POST", "/api/v1/admin/review-notes", bytes.NewReader(emptyNotesBody))
	w2 := httptest.NewRecorder()
	h.Create(w2, reqEmptyNotes)
	if w2.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for empty notes, got %d", w2.Code)
	}

	// 3. Missing entity_type
	missingTypeBody, _ := json.Marshal(reviewnote.CreateReviewNoteInput{
		EntityType:   "",
		EntityID:     "news-123",
		Notes:        "Catatan",
		ReviewerName: "Reviewer",
	})
	reqMissingType := httptest.NewRequest("POST", "/api/v1/admin/review-notes", bytes.NewReader(missingTypeBody))
	w3 := httptest.NewRecorder()
	h.Create(w3, reqMissingType)
	if w3.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing entity_type, got %d", w3.Code)
	}
}

func TestReviewNoteHandler_NormalizationAndLimit(t *testing.T) {
	repo := &mockReviewNoteRepo{}
	svc := reviewnote.NewService(repo)
	h := NewReviewNoteHandler(svc)

	// Create a note with entityType "announcements"
	body, _ := json.Marshal(reviewnote.CreateReviewNoteInput{
		EntityType:   "announcements",
		EntityID:     "ann-1",
		Action:       "request_changes",
		Notes:        "Perbaiki judul pengumuman.",
		ReviewerName: "Redaksi",
	})
	createReq := httptest.NewRequest("POST", "/api/v1/admin/review-notes", bytes.NewReader(body))
	wCreate := httptest.NewRecorder()
	h.Create(wCreate, createReq)
	if wCreate.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", wCreate.Code)
	}

	// List using path value and limit query
	listReq := httptest.NewRequest("GET", "/api/v1/admin/review-notes/announcements/ann-1?limit=10", nil)
	listReq.SetPathValue("entityType", "announcements")
	listReq.SetPathValue("entityId", "ann-1")
	wList := httptest.NewRecorder()
	h.List(wList, listReq)

	if wList.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", wList.Code, wList.Body.String())
	}

	var resp struct {
		Data []reviewnote.ReviewNote `json:"data"`
	}
	if err := json.Unmarshal(wList.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to parse response: %v", err)
	}

	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 note, got %d", len(resp.Data))
	}
	if resp.Data[0].Notes != "Perbaiki judul pengumuman." {
		t.Fatalf("unexpected notes content: %s", resp.Data[0].Notes)
	}
}
