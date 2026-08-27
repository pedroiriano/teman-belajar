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
