package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/dashboard"
)

type mockDashboardRepo struct {
	summary       *dashboard.Summary
	workflowItems []dashboard.WorkflowItem
	err           error
}

func (m *mockDashboardRepo) GetSummary(ctx context.Context, reviewLimit int) (*dashboard.Summary, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.summary, nil
}

func (m *mockDashboardRepo) GetWorkflowItems(ctx context.Context, filter dashboard.WorkflowFilter) ([]dashboard.WorkflowItem, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.workflowItems, nil
}

func TestDashboardHandler_GetSummary_Success(t *testing.T) {
	mockRepo := &mockDashboardRepo{
		summary: &dashboard.Summary{
			KPI: dashboard.KPI{
				TotalPublished: 42,
				TotalDraft:     15,
				PendingReview:  8,
				ActivePrograms: 3,
			},
			ContentBreakdown: dashboard.ContentBreakdown{
				Knowledge:     dashboard.StatusCounts{Published: 12, Draft: 3, InReview: 2},
				News:          dashboard.StatusCounts{Published: 8, Draft: 2, InReview: 1},
				Announcements: dashboard.StatusCounts{Published: 5, Draft: 1, InReview: 0},
				FAQs:          dashboard.StatusCounts{Published: 10, Draft: 4, InReview: 1},
				Microlearning: dashboard.StatusCounts{Published: 7, Draft: 5, InReview: 4},
				Training:      dashboard.StatusCounts{Published: 2, Draft: 1, InReview: 0},
				LearningPaths: dashboard.StatusCounts{Published: 1, Draft: 2, InReview: 0},
			},
			ReviewQueue: []dashboard.ReviewItem{
				{
					ID:        "item-1",
					Title:     "Panduan Onboarding",
					Module:    "knowledge",
					Status:    "in_review",
					Author:    "editor@example.com",
					UpdatedAt: time.Now().UTC(),
				},
			},
		},
	}

	svc := dashboard.NewService(mockRepo)
	h := NewDashboardHandler(svc)

	req := httptest.NewRequest("GET", "/api/v1/admin/dashboard/summary", nil)
	rr := httptest.NewRecorder()

	h.GetSummary(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp dashboard.Summary
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal JSON response: %v", err)
	}

	if resp.KPI.TotalPublished != 42 {
		t.Errorf("expected TotalPublished 42, got %d", resp.KPI.TotalPublished)
	}
	if resp.KPI.ActivePrograms != 3 {
		t.Errorf("expected ActivePrograms 3, got %d", resp.KPI.ActivePrograms)
	}
	if len(resp.ReviewQueue) != 1 {
		t.Fatalf("expected 1 review item, got %d", len(resp.ReviewQueue))
	}
	if resp.ReviewQueue[0].Title != "Panduan Onboarding" {
		t.Errorf("expected title 'Panduan Onboarding', got %s", resp.ReviewQueue[0].Title)
	}
	if resp.GeneratedAt.IsZero() {
		t.Error("expected GeneratedAt to be set, but was zero")
	}
}

func TestDashboardHandler_GetSummary_Error(t *testing.T) {
	mockRepo := &mockDashboardRepo{
		err: errors.New("db query failed"),
	}

	svc := dashboard.NewService(mockRepo)
	h := NewDashboardHandler(svc)

	req := httptest.NewRequest("GET", "/api/v1/admin/dashboard/summary", nil)
	rr := httptest.NewRecorder()

	h.GetSummary(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

func TestDashboardHandler_GetWorkflow_Success(t *testing.T) {
	mockRepo := &mockDashboardRepo{
		workflowItems: []dashboard.WorkflowItem{
			{
				ID:        "wf-1",
				Title:     "Artikel AI Pembelajaran",
				Module:    "knowledge",
				Status:    "draft",
				Author:    "penulis@example.com",
				UpdatedAt: time.Now().UTC(),
			},
			{
				ID:        "wf-2",
				Title:     "Pengumuman Webinar",
				Module:    "announcements",
				Status:    "in_review",
				Author:    "editor@example.com",
				UpdatedAt: time.Now().UTC(),
			},
		},
	}

	svc := dashboard.NewService(mockRepo)
	h := NewDashboardHandler(svc)

	req := httptest.NewRequest("GET", "/api/v1/admin/workflow?module=knowledge&status=draft&limit=10", nil)
	rr := httptest.NewRecorder()

	h.GetWorkflow(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rr.Code)
	}

	var resp struct {
		Data []dashboard.WorkflowItem `json:"data"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal JSON response: %v", err)
	}

	if len(resp.Data) != 2 {
		t.Fatalf("expected 2 items, got %d", len(resp.Data))
	}
	if resp.Data[0].Title != "Artikel AI Pembelajaran" {
		t.Errorf("expected title 'Artikel AI Pembelajaran', got %s", resp.Data[0].Title)
	}
}

func TestDashboardHandler_GetWorkflow_Error(t *testing.T) {
	mockRepo := &mockDashboardRepo{
		err: errors.New("db error"),
	}

	svc := dashboard.NewService(mockRepo)
	h := NewDashboardHandler(svc)

	req := httptest.NewRequest("GET", "/api/v1/admin/workflow", nil)
	rr := httptest.NewRecorder()

	h.GetWorkflow(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("expected status 500, got %d", rr.Code)
	}
}

