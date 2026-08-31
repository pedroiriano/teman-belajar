package workerhealth

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRecorderStatesAndReadOnlyHandler(t *testing.T) {
	recorder := NewRecorder(time.Minute)
	if got := recorder.Snapshot(time.Now()); got.Status != "unknown" || got.ErrorClass != "never_reported" {
		t.Fatalf("initial=%#v", got)
	}
	recorder.Record(true)
	if got := recorder.Snapshot(time.Now()); got.Status != "healthy" || got.LastSuccessAt == nil {
		t.Fatalf("healthy=%#v", got)
	}
	recorder.Record(false)
	if got := recorder.Snapshot(time.Now()); got.Status != "degraded" || got.ErrorClass != "worker_failed" {
		t.Fatalf("degraded=%#v", got)
	}
	stale := NewRecorder(time.Millisecond)
	stale.Record(true)
	if got := stale.Snapshot(time.Now().Add(2 * time.Millisecond)); got.Status != "degraded" || got.ErrorClass != "stale" {
		t.Fatalf("stale=%#v", got)
	}

	request := httptest.NewRequest(http.MethodPost, "/healthz?target=http://attacker.invalid", nil)
	response := httptest.NewRecorder()
	recorder.Handler().ServeHTTP(response, request)
	if response.Code != http.StatusNotFound {
		t.Fatalf("mutating or parameterized request must be denied: %d", response.Code)
	}
}
