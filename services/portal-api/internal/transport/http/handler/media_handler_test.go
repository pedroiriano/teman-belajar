package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/transport/http/middleware"
)

func mediaRequestWithClaims(method, path string, claims middleware.CustomClaims) *http.Request {
	request := httptest.NewRequest(method, path, strings.NewReader(""))
	ctx := context.WithValue(request.Context(), middleware.ClaimsContextKey, claims)
	return request.WithContext(ctx)
}

func TestMediaWriteEndpointsDenyReviewerBypass(t *testing.T) {
	handler := NewMediaHandler(nil)
	claims := middleware.CustomClaims{Subject: "reviewer", RealmAccess: middleware.RealmAccess{Roles: []string{"Reviewer"}}}
	tests := []struct {
		name   string
		invoke func(http.ResponseWriter, *http.Request)
	}{
		{"upload", handler.CreateMedia}, {"update", handler.UpdateMediaMetadata}, {"archive", handler.ArchiveMedia}, {"attach", handler.AttachMediaUsage}, {"detach", handler.DetachMediaUsage},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := mediaRequestWithClaims(http.MethodPost, "/api/v1/admin/media/00000000-0000-0000-0000-000000000000", claims)
			test.invoke(response, request)
			if response.Code != http.StatusForbidden {
				t.Fatalf("got %d, want 403", response.Code)
			}
			if !strings.Contains(response.Body.String(), "MEDIA_WRITE_FORBIDDEN") {
				t.Fatalf("missing deterministic code: %s", response.Body.String())
			}
		})
	}
}

func TestMediaPolicyIsExact(t *testing.T) {
	handler := NewMediaHandler(nil)
	response := httptest.NewRecorder()
	handler.GetMediaPolicy(response, httptest.NewRequest(http.MethodGet, "/api/v1/admin/media/policy", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("got %d", response.Code)
	}
	body := response.Body.String()
	for _, expected := range []string{"2621440", "20971520", "33554432", ".webp", "application/pdf"} {
		if !strings.Contains(body, expected) {
			t.Fatalf("policy missing %s: %s", expected, body)
		}
	}
}
