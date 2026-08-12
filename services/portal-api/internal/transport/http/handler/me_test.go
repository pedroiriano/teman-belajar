package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/transport/http/middleware"
)

func TestGetMe(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/me", nil)

	claims := middleware.CustomClaims{
		Subject:           "123e4567-e89b-12d3-a456-426614174000",
		Name:              "John Learner",
		PreferredUsername: "john.learner",
	}
	
	ctx := context.WithValue(req.Context(), middleware.ClaimsContextKey, claims)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(GetMe)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var profile UserProfile
	err := json.NewDecoder(rr.Body).Decode(&profile)
	if err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if profile.ID != claims.Subject {
		t.Errorf("expected ID %s, got %s", claims.Subject, profile.ID)
	}
	if profile.DisplayName != claims.Name {
		t.Errorf("expected DisplayName %s, got %s", claims.Name, profile.DisplayName)
	}
}

func TestGetMe_NoClaims(t *testing.T) {
	req := httptest.NewRequest("GET", "/api/v1/me", nil)
	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(GetMe)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusUnauthorized)
	}
}
