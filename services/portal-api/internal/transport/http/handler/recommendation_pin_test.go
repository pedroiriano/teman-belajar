package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/recommendationpin"
	"teman-belajar-api/internal/transport/http/middleware"
)

type mockRecPinRepo struct {
	pins []recommendationpin.RecommendationPin
}

func (m *mockRecPinRepo) List(ctx context.Context, targetType string, limit int) ([]recommendationpin.RecommendationPin, error) {
	return m.pins, nil
}

func (m *mockRecPinRepo) Create(ctx context.Context, pin recommendationpin.RecommendationPin) (*recommendationpin.RecommendationPin, error) {
	pin.ID = "pin-123"
	m.pins = append(m.pins, pin)
	return &pin, nil
}

func (m *mockRecPinRepo) Delete(ctx context.Context, id string) error {
	var remaining []recommendationpin.RecommendationPin
	for _, p := range m.pins {
		if p.ID != id {
			remaining = append(remaining, p)
		}
	}
	m.pins = remaining
	return nil
}

func TestRecommendationPinHandler_ListCreateDelete(t *testing.T) {
	repo := &mockRecPinRepo{}
	svc := recommendationpin.NewService(repo)
	h := NewRecommendationPinHandler(svc)

	// Create
	body, _ := json.Marshal(recommendationpin.CreatePinInput{
		TargetType: "knowledge",
		TargetID:   "art-1",
		Title:      "Pengantar Keamanan",
		Weight:     100,
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/recommendations/pins", bytes.NewReader(body))
	claims := middleware.CustomClaims{
		Subject: "admin-1",
		RealmAccess: middleware.RealmAccess{
			Roles: []string{"Portal Administrator"},
		},
	}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w1 := httptest.NewRecorder()
	h.Create(w1, req)

	if w1.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w1.Code, w1.Body.String())
	}

	// List
	listReq := httptest.NewRequest("GET", "/api/v1/admin/recommendations/pins", nil)
	w2 := httptest.NewRecorder()
	h.List(w2, listReq)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	// Delete
	delReq := httptest.NewRequest("DELETE", "/api/v1/admin/recommendations/pins/pin-123", nil)
	delReq.SetPathValue("id", "pin-123")
	w3 := httptest.NewRecorder()
	h.Delete(w3, delReq)

	if w3.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d", w3.Code)
	}
}
