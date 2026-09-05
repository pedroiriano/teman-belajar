package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/transport/http/middleware"
)

func TestBatchHandler_Unauthorized(t *testing.T) {
	h := NewBatchHandler(nil, nil, nil, nil, nil, nil, nil, nil)
	body, _ := json.Marshal(BatchTransitionRequest{
		Action: "publish",
		Items:  []BatchItemRequest{{ID: "1", Module: "knowledge"}},
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/batch-transitions", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.HandleBatchTransitions(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", w.Code)
	}
}

func TestBatchHandler_EmptyItems(t *testing.T) {
	h := NewBatchHandler(nil, nil, nil, nil, nil, nil, nil, nil)
	body, _ := json.Marshal(BatchTransitionRequest{
		Action: "publish",
		Items:  []BatchItemRequest{},
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/batch-transitions", bytes.NewReader(body))
	claims := middleware.CustomClaims{
		Subject: "admin-1",
		RealmAccess: middleware.RealmAccess{
			Roles: []string{"Portal Administrator"},
		},
	}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.HandleBatchTransitions(w, req)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestBatchHandler_ProcessItems(t *testing.T) {
	h := NewBatchHandler(nil, nil, nil, nil, nil, nil, nil, nil)
	body, _ := json.Marshal(BatchTransitionRequest{
		Action: "publish",
		Items: []BatchItemRequest{
			{ID: "art-1", Module: "unknown_module", Title: "Unknown Item"},
		},
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/batch-transitions", bytes.NewReader(body))
	claims := middleware.CustomClaims{
		Subject: "admin-1",
		RealmAccess: middleware.RealmAccess{
			Roles: []string{"Portal Administrator"},
		},
	}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()
	h.HandleBatchTransitions(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var res BatchOperationResult
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.Total != 1 || res.Failed != 1 {
		t.Fatalf("expected 1 total and 1 failed, got %d total and %d failed", res.Total, res.Failed)
	}
}
