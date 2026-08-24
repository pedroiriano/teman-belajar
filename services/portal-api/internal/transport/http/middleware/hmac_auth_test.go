package middleware

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/audit"
)

// mockAuditRepo implements audit.Repository for testing.
type mockAuditRepo struct {
	events []*audit.AuditEvent
}

func (m *mockAuditRepo) CreateEvent(_ context.Context, event *audit.AuditEvent) error {
	m.events = append(m.events, event)
	return nil
}

func signRequest(body []byte, secret string, ts int64) (string, string) {
	tsStr := fmt.Sprintf("%d", ts)
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(tsStr))
	mac.Write([]byte("\n"))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil)), tsStr
}

func TestHMACAuth_ValidSignature(t *testing.T) {
	secret := "test-secret-with-enough-entropy-1234567890"
	auditRepo := &mockAuditRepo{}
	body := []byte(`{"event_id":"e1"}`)
	ts := time.Now().Unix()
	sig, tsStr := signRequest(body, secret, ts)

	handler := HMACAuthMiddleware(secret, auditRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("POST", "/test", bytes.NewReader(body))
	req.Header.Set(HMACSignatureHeader, sig)
	req.Header.Set(HMACTimestampHeader, tsStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
	if len(auditRepo.events) != 0 {
		t.Errorf("expected no audit events, got %d", len(auditRepo.events))
	}
}

func TestHMACAuth_MissingHeaders(t *testing.T) {
	secret := "test-secret-with-enough-entropy-1234567890"
	auditRepo := &mockAuditRepo{}

	handler := HMACAuthMiddleware(secret, auditRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("POST", "/test", bytes.NewReader([]byte(`{}`)))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if len(auditRepo.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(auditRepo.events))
	}
	if auditRepo.events[0].Action != "moodle_event_ingest_auth" {
		t.Errorf("unexpected audit action: %s", auditRepo.events[0].Action)
	}
}

func TestHMACAuth_InvalidSignature(t *testing.T) {
	secret := "test-secret-with-enough-entropy-1234567890"
	auditRepo := &mockAuditRepo{}
	body := []byte(`{"event_id":"e1"}`)
	ts := time.Now().Unix()
	_, tsStr := signRequest(body, secret, ts)

	handler := HMACAuthMiddleware(secret, auditRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("POST", "/test", bytes.NewReader(body))
	req.Header.Set(HMACSignatureHeader, "invalid-signature")
	req.Header.Set(HMACTimestampHeader, tsStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
	if len(auditRepo.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(auditRepo.events))
	}
}

func TestHMACAuth_ExpiredTimestamp(t *testing.T) {
	secret := "test-secret-with-enough-entropy-1234567890"
	auditRepo := &mockAuditRepo{}
	body := []byte(`{"event_id":"e1"}`)
	// Use a timestamp 10 minutes in the past (beyond 5-minute window)
	ts := time.Now().Add(-10 * time.Minute).Unix()
	sig, tsStr := signRequest(body, secret, ts)

	handler := HMACAuthMiddleware(secret, auditRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("POST", "/test", bytes.NewReader(body))
	req.Header.Set(HMACSignatureHeader, sig)
	req.Header.Set(HMACTimestampHeader, tsStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestHMACAuth_TamperedBody(t *testing.T) {
	secret := "test-secret-with-enough-entropy-1234567890"
	auditRepo := &mockAuditRepo{}
	originalBody := []byte(`{"event_id":"e1"}`)
	ts := time.Now().Unix()
	sig, tsStr := signRequest(originalBody, secret, ts)

	handler := HMACAuthMiddleware(secret, auditRepo)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	// Send with tampered body
	tamperedBody := []byte(`{"event_id":"e1","extra":"tampered"}`)
	req := httptest.NewRequest("POST", "/test", bytes.NewReader(tamperedBody))
	req.Header.Set(HMACSignatureHeader, sig)
	req.Header.Set(HMACTimestampHeader, tsStr)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}
