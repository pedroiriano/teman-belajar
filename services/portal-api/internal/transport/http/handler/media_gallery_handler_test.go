package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/transport/http/middleware"
)

func TestMediaGalleryDeniesMissingRole(t *testing.T) {
	handler := NewMediaGalleryHandler(nil, nil)
	request := httptest.NewRequest(http.MethodGet, "/api/v1/admin/media-collections", nil)
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, middleware.CustomClaims{Subject: "learner", RealmAccess: middleware.RealmAccess{Roles: []string{"Learner"}}}))
	response := httptest.NewRecorder()
	handler.AdminList(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("status=%d", response.Code)
	}
}

func TestMediaGalleryRejectsUnknownBodyField(t *testing.T) {
	handler := NewMediaGalleryHandler(nil, nil)
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/media-collections", strings.NewReader(`{"slug":"safe","unknown":"secret"}`))
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, middleware.CustomClaims{Subject: "editor", RealmAccess: middleware.RealmAccess{Roles: []string{"Content Editor"}}}))
	response := httptest.NewRecorder()
	handler.Create(response, request)
	if response.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d body=%s", response.Code, response.Body.String())
	}
}
