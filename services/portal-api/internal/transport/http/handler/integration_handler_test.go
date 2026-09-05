package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	integrationapp "teman-belajar-api/internal/application/integration"
	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/transport/http/middleware"
)

type mockIntegrationRepo struct {
	summaryCounts map[string]int64
	events        []*integration.InboxEvent
	total         int64
	eventByID     map[string]*integration.InboxEvent
	requeueErr    error
}

func (m *mockIntegrationRepo) SaveEvent(ctx context.Context, event *integration.InboxEvent) (*integration.SaveResult, error) {
	return &integration.SaveResult{Saved: true}, nil
}

func (m *mockIntegrationRepo) ClaimPendingEvents(ctx context.Context, batchSize int, staleThreshold time.Duration) ([]*integration.InboxEvent, error) {
	return nil, nil
}

func (m *mockIntegrationRepo) MarkProcessed(ctx context.Context, tx *sql.Tx, event *integration.InboxEvent) error {
	return nil
}

func (m *mockIntegrationRepo) MarkFailed(ctx context.Context, event *integration.InboxEvent, errCategory string, maxAttempts int, backoffBase time.Duration) error {
	return nil
}

func (m *mockIntegrationRepo) CreateOutboxEntry(ctx context.Context, tx *sql.Tx, entry *integration.OutboxEvent) error {
	return nil
}

func (m *mockIntegrationRepo) BeginTx(ctx context.Context) (*sql.Tx, error) {
	return nil, nil
}

func (m *mockIntegrationRepo) CountByStatus(ctx context.Context) (map[string]int64, error) {
	return m.summaryCounts, nil
}

func (m *mockIntegrationRepo) ListDeadLetter(ctx context.Context, limit, offset int) ([]*integration.InboxEvent, error) {
	return nil, nil
}

func (m *mockIntegrationRepo) ListEvents(ctx context.Context, filter integration.EventFilter) ([]*integration.InboxEvent, int64, error) {
	return m.events, m.total, nil
}

func (m *mockIntegrationRepo) GetEvent(ctx context.Context, eventID string) (*integration.InboxEvent, error) {
	if ev, ok := m.eventByID[eventID]; ok {
		return ev, nil
	}
	return nil, sql.ErrNoRows
}

func (m *mockIntegrationRepo) RequeueDeadLetter(ctx context.Context, eventID string) error {
	if m.requeueErr != nil {
		return m.requeueErr
	}
	if _, ok := m.eventByID[eventID]; !ok {
		return sql.ErrNoRows
	}
	return nil
}

type mockAuditRepo struct {
	events []*audit.AuditEvent
}

func (m *mockAuditRepo) CreateEvent(ctx context.Context, event *audit.AuditEvent) error {
	m.events = append(m.events, event)
	return nil
}

func (m *mockAuditRepo) ListEvents(ctx context.Context, query audit.Query) ([]audit.AuditEvent, error) {
	return nil, nil
}

func (m *mockAuditRepo) DeleteOlderThan(ctx context.Context, cutoff time.Time) (int64, error) {
	return 0, nil
}

func setupTestHandler(repo *mockIntegrationRepo) (*IntegrationHandler, *mockAuditRepo) {
	auditRepo := &mockAuditRepo{}
	svc := integrationapp.NewEventService(repo, auditRepo)
	return NewIntegrationHandler(svc), auditRepo
}

func TestHandleGetSummary(t *testing.T) {
	repo := &mockIntegrationRepo{
		summaryCounts: map[string]int64{
			"pending":     5,
			"processing":  2,
			"processed":   100,
			"dead_letter": 1,
		},
	}
	h, _ := setupTestHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/moodle/events/summary", nil)
	rec := httptest.NewRecorder()

	h.HandleGetSummary(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var res map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res["pending"] != float64(5) || res["processing"] != float64(2) || res["processed"] != float64(100) || res["dead_letter"] != float64(1) || res["total"] != float64(108) {
		t.Fatalf("unexpected summary values: %+v", res)
	}
}

func TestHandleListEvents(t *testing.T) {
	now := time.Now().UTC()
	repo := &mockIntegrationRepo{
		events: []*integration.InboxEvent{
			{
				ID:         1,
				EventID:    "evt-001",
				EventType:  "learning.user_enrolled",
				Status:     "processed",
				CreatedAt:  now,
				OccurredAt: now,
			},
		},
		total: 1,
	}
	h, _ := setupTestHandler(repo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/moodle/events?status=processed&limit=10&offset=0", nil)
	rec := httptest.NewRecorder()

	h.HandleListEvents(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var res struct {
		Items []*integration.InboxEvent `json:"items"`
		Total int64                     `json:"total"`
		Limit int                       `json:"limit"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if res.Total != 1 || len(res.Items) != 1 || res.Items[0].EventID != "evt-001" {
		t.Fatalf("unexpected list response: %+v", res)
	}
}

func TestHandleGetEvent(t *testing.T) {
	now := time.Now().UTC()
	repo := &mockIntegrationRepo{
		eventByID: map[string]*integration.InboxEvent{
			"evt-001": {
				ID:         1,
				EventID:    "evt-001",
				EventType:  "learning.user_enrolled",
				Status:     "processed",
				CreatedAt:  now,
				OccurredAt: now,
			},
		},
	}
	h, _ := setupTestHandler(repo)

	// Test found
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/moodle/events/evt-001", nil)
	req.SetPathValue("id", "evt-001")
	rec := httptest.NewRecorder()

	h.HandleGetEvent(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	var ev integration.InboxEvent
	if err := json.Unmarshal(rec.Body.Bytes(), &ev); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if ev.EventID != "evt-001" {
		t.Fatalf("expected event_id evt-001, got %s", ev.EventID)
	}

	// Test not found
	reqNotFound := httptest.NewRequest(http.MethodGet, "/api/v1/admin/moodle/events/evt-999", nil)
	reqNotFound.SetPathValue("id", "evt-999")
	recNotFound := httptest.NewRecorder()

	h.HandleGetEvent(recNotFound, reqNotFound)
	if recNotFound.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", recNotFound.Code)
	}
}

func TestHandleRequeueEvent(t *testing.T) {
	repo := &mockIntegrationRepo{
		eventByID: map[string]*integration.InboxEvent{
			"evt-dead": {
				ID:      2,
				EventID: "evt-dead",
				Status:  "dead_letter",
			},
		},
	}
	h, auditRepo := setupTestHandler(repo)

	// Test success
	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/moodle/events/evt-dead/requeue", nil)
	req.SetPathValue("id", "evt-dead")
	claims := middleware.CustomClaims{Subject: "admin-user-42"}
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	rec := httptest.NewRecorder()
	h.HandleRequeueEvent(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", rec.Code)
	}

	if len(auditRepo.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(auditRepo.events))
	}
	if auditRepo.events[0].Action != "moodle_event_requeued" || auditRepo.events[0].ActorUserID != "admin-user-42" {
		t.Fatalf("unexpected audit event: %+v", auditRepo.events[0])
	}

	// Test not found / cannot requeue
	reqFail := httptest.NewRequest(http.MethodPost, "/api/v1/admin/moodle/events/evt-nonexistent/requeue", nil)
	reqFail.SetPathValue("id", "evt-nonexistent")
	recFail := httptest.NewRecorder()

	h.HandleRequeueEvent(recFail, reqFail)
	if recFail.Code != http.StatusNotFound {
		t.Fatalf("expected status 404, got %d", recFail.Code)
	}
}
