package handler

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/webinar"
	"teman-belajar-api/internal/transport/http/middleware"
)

type webinarProviderStub struct{ calls int }

func (p *webinarProviderStub) List(context.Context, webinar.Identity, int, int) (webinar.Page, error) {
	p.calls++
	return webinar.Page{}, nil
}

func TestWebinarMutationIsRateLimitedPerSubject(t *testing.T) {
	provider := &webinarProviderStub{}
	handler := NewWebinarHandler(webinar.NewService(provider, nil))
	for index := 1; index <= 21; index++ {
		recorder := httptest.NewRecorder()
		req := webinarRequest(http.MethodPost, "/api/v1/webinars/9/registrations", true)
		req.SetPathValue("id", "9")
		req.Header.Set("Idempotency-Key", fmt.Sprintf("register:rate:%02d", index))
		handler.Register(recorder, req)
		if index <= 20 && recorder.Code != http.StatusOK {
			t.Fatalf("request %d status=%d", index, recorder.Code)
		}
		if index == 21 && recorder.Code != http.StatusTooManyRequests {
			t.Fatalf("rate limit status=%d", recorder.Code)
		}
	}
	if provider.calls != 20 {
		t.Fatalf("provider calls=%d", provider.calls)
	}
}
func (p *webinarProviderStub) Get(context.Context, webinar.Identity, int) (webinar.Session, error) {
	p.calls++
	return webinar.Session{ID: 9}, nil
}
func (p *webinarProviderStub) Register(context.Context, webinar.Identity, int, string) (webinar.Session, error) {
	p.calls++
	return webinar.Session{ID: 9}, nil
}
func (p *webinarProviderStub) Cancel(context.Context, webinar.Identity, int, string) (webinar.Session, error) {
	p.calls++
	return webinar.Session{ID: 9}, nil
}

func webinarRequest(method, path string, authenticated bool) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	if authenticated {
		claims := middleware.CustomClaims{Subject: "11111111-1111-4111-8111-111111111111"}
		req = req.WithContext(context.WithValue(req.Context(), middleware.ClaimsContextKey, claims))
	}
	return req
}

func TestWebinarHandlerRequiresValidatedIdentity(t *testing.T) {
	provider := &webinarProviderStub{}
	handler := NewWebinarHandler(webinar.NewService(provider, nil))
	recorder := httptest.NewRecorder()
	handler.List(recorder, webinarRequest(http.MethodGet, "/api/v1/webinars", false))
	if recorder.Code != http.StatusUnauthorized || provider.calls != 0 {
		t.Fatalf("status=%d calls=%d", recorder.Code, provider.calls)
	}
}

func TestWebinarMutationRequiresIdempotencyKey(t *testing.T) {
	provider := &webinarProviderStub{}
	handler := NewWebinarHandler(webinar.NewService(provider, nil))
	recorder := httptest.NewRecorder()
	req := webinarRequest(http.MethodPost, "/api/v1/webinars/9/registrations", true)
	req.SetPathValue("id", "9")
	handler.Register(recorder, req)
	if recorder.Code != http.StatusUnprocessableEntity || provider.calls != 0 {
		t.Fatalf("status=%d calls=%d", recorder.Code, provider.calls)
	}
}

func TestWebinarHandler_AuditLogging(t *testing.T) {
	provider := &webinarProviderStub{}
	auditR := &mockAuditRepo{}
	handler := NewWebinarHandler(webinar.NewService(provider, nil), auditR)

	// Register
	recorder := httptest.NewRecorder()
	req := webinarRequest(http.MethodPost, "/api/v1/webinars/9/registrations", true)
	req.SetPathValue("id", "9")
	req.Header.Set("Idempotency-Key", "register:audit:01")
	handler.Register(recorder, req)
	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}
	if len(auditR.events) != 1 {
		t.Fatalf("expected 1 audit event, got %d", len(auditR.events))
	}
	if auditR.events[0].Action != "WEBINAR_REGISTERED" {
		t.Errorf("expected WEBINAR_REGISTERED, got %s", auditR.events[0].Action)
	}
	if auditR.events[0].Module != "webinars" {
		t.Errorf("expected module webinars, got %s", auditR.events[0].Module)
	}

	// Cancel
	recCancel := httptest.NewRecorder()
	reqCancel := webinarRequest(http.MethodDelete, "/api/v1/webinars/9/registrations", true)
	reqCancel.SetPathValue("id", "9")
	reqCancel.Header.Set("Idempotency-Key", "cancel:audit:01")
	handler.Cancel(recCancel, reqCancel)
	if recCancel.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recCancel.Code)
	}
	if len(auditR.events) != 2 {
		t.Fatalf("expected 2 audit events, got %d", len(auditR.events))
	}
	if auditR.events[1].Action != "WEBINAR_CANCELLED" {
		t.Errorf("expected WEBINAR_CANCELLED, got %s", auditR.events[1].Action)
	}

	// Admin Get Detail
	recAdmin := httptest.NewRecorder()
	reqAdmin := webinarRequest(http.MethodGet, "/api/v1/admin/webinars/9", true)
	reqAdmin.SetPathValue("id", "9")
	handler.AdminGet(recAdmin, reqAdmin)
	if recAdmin.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recAdmin.Code)
	}
	if len(auditR.events) != 3 {
		t.Fatalf("expected 3 audit events, got %d", len(auditR.events))
	}
	if auditR.events[2].Action != "WEBINAR_DETAIL_VIEWED" {
		t.Errorf("expected WEBINAR_DETAIL_VIEWED, got %s", auditR.events[2].Action)
	}
}
