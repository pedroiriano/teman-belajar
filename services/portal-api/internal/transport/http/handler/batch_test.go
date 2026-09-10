package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/cms"
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

func TestBatchHandler_SuccessWithCMSAndKnowledge(t *testing.T) {
	cmsRepo := newMockCMSRepo()
	cmsRepo.news["news-1"] = &cms.News{
		ID:        "news-1",
		Slug:      "news-in-review",
		Title:     "News In Review",
		Excerpt:   "Excerpt 1",
		Body:      "Body 1",
		Status:    cms.StatusInReview,
		CreatedAt: time.Now(),
		Version:   1,
	}
	cmsRepo.news["news-2"] = &cms.News{
		ID:        "news-2",
		Slug:      "news-approved",
		Title:     "News Approved",
		Excerpt:   "Excerpt 2",
		Body:      "Body 2",
		Status:    cms.StatusApproved,
		CreatedAt: time.Now(),
		Version:   1,
	}
	cmsRepo.announcement["ann-1"] = &cms.Announcement{
		ID:        "ann-1",
		Slug:      "ann-approved",
		Title:     "Ann Approved",
		Body:      "Ann Body 1",
		Status:    cms.StatusApproved,
		CreatedAt: time.Now(),
		Version:   1,
	}

	cmsSvc := cms.NewService(cmsRepo, nil)
	h := NewBatchHandler(nil, cmsSvc, nil, nil, nil, nil, nil, nil)

	body, _ := json.Marshal(BatchTransitionRequest{
		Action: "publish",
		Items: []BatchItemRequest{
			{ID: "news-1", Module: "news", Title: "News In Review"},
			{ID: "news-2", Module: "news", Title: "News Approved"},
			{ID: "ann-1", Module: "announcements", Title: "Ann Approved"},
		},
		Notes: "Publikasi massal oleh redaksi",
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/batch-transitions", bytes.NewReader(body))
	claims := middleware.CustomClaims{
		Subject: "admin-reviewer",
		RealmAccess: middleware.RealmAccess{
			Roles: []string{"Reviewer", "Portal Administrator"},
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

	if res.Total != 3 {
		t.Errorf("expected total 3, got %d", res.Total)
	}
	if res.Succeeded != 2 {
		t.Errorf("expected succeeded 2, got %d", res.Succeeded)
	}
	if res.Failed != 1 {
		t.Errorf("expected failed 1, got %d", res.Failed)
	}
	if len(res.Errors) != 1 || res.Errors[0].ID != "news-1" {
		t.Errorf("expected error for news-1, got %+v", res.Errors)
	}

	// Verify states in repo
	if cmsRepo.news["news-2"].Status != cms.StatusPublished {
		t.Errorf("expected news-2 to be published, got %s", cmsRepo.news["news-2"].Status)
	}
	if cmsRepo.announcement["ann-1"].Status != cms.StatusPublished {
		t.Errorf("expected ann-1 to be published, got %s", cmsRepo.announcement["ann-1"].Status)
	}
}
