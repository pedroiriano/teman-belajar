package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/schedule"
)

type mockScheduleRepo struct {
	events []schedule.ScheduleEvent
}

func (m *mockScheduleRepo) List(ctx context.Context, month string, entityType string) ([]schedule.ScheduleEvent, error) {
	return m.events, nil
}
func (m *mockScheduleRepo) Create(ctx context.Context, ev schedule.ScheduleEvent) (*schedule.ScheduleEvent, error) {
	ev.ID = "test-sched-1"
	m.events = append(m.events, ev)
	return &ev, nil
}
func (m *mockScheduleRepo) GetByID(ctx context.Context, id string) (*schedule.ScheduleEvent, error) {
	for _, ev := range m.events {
		if ev.ID == id {
			return &ev, nil
		}
	}
	return nil, schedule.ErrNotFound
}
func (m *mockScheduleRepo) GetPendingExecution(ctx context.Context, cutoff time.Time, limit int) ([]schedule.ScheduleEvent, error) {
	return nil, nil
}
func (m *mockScheduleRepo) MarkExecuted(ctx context.Context, id string, executedAt time.Time) error {
	return nil
}
func (m *mockScheduleRepo) MarkFailed(ctx context.Context, id string, reason string) error {
	return nil
}
func (m *mockScheduleRepo) Cancel(ctx context.Context, id string) error {
	for i, ev := range m.events {
		if ev.ID == id {
			m.events[i].Status = "cancelled"
			return nil
		}
	}
	return schedule.ErrNotFound
}

func TestScheduleHandler_List(t *testing.T) {
	repo := &mockScheduleRepo{
		events: []schedule.ScheduleEvent{
			{
				ID:         "sch-1",
				EntityType: "knowledge",
				Title:      "Panduan Keamanan",
				TargetDate: "2026-09-01",
				TargetTime: "09:00",
				Status:     "scheduled",
			},
		},
	}
	svc := schedule.NewService(repo, nil)
	h := NewScheduleHandler(svc)

	req := httptest.NewRequest("GET", "/api/v1/admin/schedules", nil)
	w := httptest.NewRecorder()
	h.List(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var res schedule.ListResult
	if err := json.Unmarshal(w.Body.Bytes(), &res); err != nil {
		t.Fatalf("unmarshal error: %v", err)
	}
	if len(res.Events) != 1 {
		t.Fatalf("expected 1 event, got %d", len(res.Events))
	}
}

func TestScheduleHandler_Create(t *testing.T) {
	repo := &mockScheduleRepo{}
	svc := schedule.NewService(repo, nil)
	h := NewScheduleHandler(svc)

	body, _ := json.Marshal(schedule.CreateScheduleInput{
		Title:      "Artikel Baru",
		TargetDate: "2026-09-10",
		TargetTime: "14:00",
		Module:     "Pengetahuan",
	})
	req := httptest.NewRequest("POST", "/api/v1/admin/schedules", bytes.NewReader(body))
	w := httptest.NewRecorder()
	h.Create(w, req)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}
