package handler

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/discoverability"
)

func TestRespondInternalPermanentRedirect(t *testing.T) {
	valid := httptest.NewRecorder()
	if !respondInternalPermanentRedirect(valid, &discoverability.Redirect{Location: "/news/current-slug", Status: http.StatusPermanentRedirect}, "/news/") {
		t.Fatal("valid internal redirect was rejected")
	}
	if valid.Code != http.StatusPermanentRedirect || valid.Header().Get("Location") != "/news/current-slug" {
		t.Fatalf("unexpected redirect response: %d %q", valid.Code, valid.Header().Get("Location"))
	}

	for _, location := range []string{"https://evil.test/news/x", "//evil.test/news/x", "/news/../admin", "/news/x%0d%0aX-Test:y", "/knowledge/wrong-route"} {
		recorder := httptest.NewRecorder()
		if respondInternalPermanentRedirect(recorder, &discoverability.Redirect{Location: location, Status: http.StatusPermanentRedirect}, "/news/") {
			t.Fatalf("unsafe redirect accepted: %q", location)
		}
		if recorder.Header().Get("Location") != "" {
			t.Fatalf("unsafe Location emitted: %q", recorder.Header().Get("Location"))
		}
	}
}
