package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/domain/knowledge"
	"teman-belajar-api/internal/transport/http/middleware"
)

func TestKnowledgeHierarchyReviewerMutationIsDenied(t *testing.T) {
	handler := NewKnowledgeHierarchyHandler(knowledge.NewHierarchyService(nil, nil))
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/knowledge-hierarchy/nodes", strings.NewReader(`{"type":"topic","slug":"safe","title":"Safe","sort_order":1}`))
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, middleware.CustomClaims{RealmAccess: middleware.RealmAccess{Roles: []string{"Reviewer"}}}))
	response := httptest.NewRecorder()
	handler.CreateNode(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("reviewer mutation status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestKnowledgeHierarchyRejectsUnknownJSONFields(t *testing.T) {
	handler := NewKnowledgeHierarchyHandler(knowledge.NewHierarchyService(nil, nil))
	request := httptest.NewRequest(http.MethodPost, "/api/v1/admin/knowledge-hierarchy/nodes", strings.NewReader(`{"type":"topic","slug":"safe","title":"Safe","sort_order":1,"actor_id":"forged"}`))
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, middleware.CustomClaims{Subject: "10000000-0000-0000-0000-000000000001", RealmAccess: middleware.RealmAccess{Roles: []string{"Content Editor"}}}))
	response := httptest.NewRecorder()
	handler.CreateNode(response, request)
	if response.Code != http.StatusBadRequest {
		t.Fatalf("unknown actor field status=%d body=%s", response.Code, response.Body.String())
	}
}
