package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	applicationsearch "teman-belajar-api/internal/application/search"
	domainsearch "teman-belajar-api/internal/domain/search"
)

type searchProviderStub struct {
	result domainsearch.Result
	err    error
}

func (p searchProviderStub) Search(context.Context, domainsearch.Query) (domainsearch.Result, error) {
	return p.result, p.err
}

func TestSearchHandlerRejectsUnknownAndInvalidParameters(t *testing.T) {
	handler := NewSearchHandler(applicationsearch.NewService(searchProviderStub{}))
	for _, path := range []string{
		"/api/v1/search?q=test&filter=source_type%20%3D%20news",
		"/api/v1/search?q=test&page=0",
		"/api/v1/search?q=test&page_size=51",
		"/api/v1/search?q=test&content_type=private",
		"/api/v1/search?q=test&sort=title%3Aasc",
	} {
		recorder := httptest.NewRecorder()
		handler.Search(recorder, httptest.NewRequest(http.MethodGet, path, nil))
		if recorder.Code != http.StatusUnprocessableEntity {
			t.Fatalf("%s returned %d, want 422", path, recorder.Code)
		}
		if got := recorder.Header().Get("Content-Type"); got != "application/problem+json" {
			t.Fatalf("unexpected content type: %s", got)
		}
	}
}

func TestSearchHandlerReturnsOwnedDTOAndEscapesHTML(t *testing.T) {
	service := applicationsearch.NewService(searchProviderStub{result: domainsearch.Result{
		Hits:  []domainsearch.Hit{{ID: "news_1", ContentType: "news", Title: `<script>alert(1)</script>`, Snippet: "safe", URL: "/news/test", Tags: []string{}}},
		Total: 1,
	}})
	recorder := httptest.NewRecorder()
	NewSearchHandler(service).Search(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/search?q=test&page=1&page_size=20", nil))
	if recorder.Code != http.StatusOK {
		t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if strings.Contains(recorder.Body.String(), "<script>") {
		t.Fatalf("literal executable HTML leaked: %s", recorder.Body.String())
	}
	for _, forbidden := range []string{"processing_time_ms", "generation", "source_id", "estimatedTotalHits"} {
		if strings.Contains(recorder.Body.String(), forbidden) {
			t.Fatalf("engine/internal field %q leaked", forbidden)
		}
	}
}

func TestSearchHandlerReturns503WithoutDependencyDetails(t *testing.T) {
	service := applicationsearch.NewService(searchProviderStub{err: context.DeadlineExceeded})
	recorder := httptest.NewRecorder()
	NewSearchHandler(service).Search(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/search?q=test", nil))
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status=%d", recorder.Code)
	}
	if strings.Contains(recorder.Body.String(), "deadline") {
		t.Fatalf("dependency detail leaked: %s", recorder.Body.String())
	}
}
