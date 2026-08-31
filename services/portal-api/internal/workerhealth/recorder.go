package workerhealth

import (
	"encoding/json"
	"net/http"
	"sync"
	"time"
)

type Recorder struct {
	mu          sync.RWMutex
	staleAfter  time.Duration
	lastAttempt *time.Time
	lastSuccess *time.Time
	failed      bool
}

type Response struct {
	Status        string     `json:"status"`
	LastAttemptAt *time.Time `json:"last_attempt_at,omitempty"`
	LastSuccessAt *time.Time `json:"last_success_at,omitempty"`
	ErrorClass    string     `json:"error_class,omitempty"`
}

func NewRecorder(staleAfter time.Duration) *Recorder {
	if staleAfter <= 0 {
		staleAfter = 15 * time.Minute
	}
	return &Recorder{staleAfter: staleAfter}
}

func (r *Recorder) Record(success bool) {
	now := time.Now().UTC()
	r.mu.Lock()
	defer r.mu.Unlock()
	r.lastAttempt = &now
	r.failed = !success
	if success {
		r.lastSuccess = &now
	}
}

func (r *Recorder) Snapshot(now time.Time) Response {
	r.mu.RLock()
	defer r.mu.RUnlock()
	result := Response{Status: "unknown", LastAttemptAt: r.lastAttempt, LastSuccessAt: r.lastSuccess}
	if r.lastAttempt == nil {
		result.ErrorClass = "never_reported"
		return result
	}
	if r.failed {
		result.Status = "down"
		result.ErrorClass = "worker_failed"
		if r.lastSuccess != nil {
			result.Status = "degraded"
		}
		return result
	}
	if r.lastSuccess == nil {
		result.ErrorClass = "never_reported"
		return result
	}
	if now.UTC().Sub(r.lastSuccess.UTC()) > r.staleAfter {
		result.Status = "degraded"
		result.ErrorClass = "stale"
		return result
	}
	result.Status = "healthy"
	return result
}

func (r *Recorder) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet || request.URL.Path != "/healthz" || request.URL.RawQuery != "" {
			http.NotFound(w, request)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("Cache-Control", "no-store")
		_ = json.NewEncoder(w).Encode(r.Snapshot(time.Now().UTC()))
	})
}
