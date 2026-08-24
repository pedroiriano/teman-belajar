package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"teman-belajar-api/internal/domain/draft"
	"teman-belajar-api/internal/transport/http/middleware"
)

func TestDraftWriteEndpointsDenyReviewerBypass(t *testing.T) {
	handler := NewDraftHandler(draft.NewService(nil, nil, 30))
	request := httptest.NewRequest(http.MethodPut, "/api/v1/admin/form-drafts/00000000-0000-4000-8000-000000000000", nil)
	request.SetPathValue("draftKey", "00000000-0000-4000-8000-000000000000")
	claims := middleware.CustomClaims{Subject: "00000000-0000-4000-8000-000000000001", RealmAccess: middleware.RealmAccess{Roles: []string{"Reviewer"}}}
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, claims))
	recorder := httptest.NewRecorder()
	handler.Save(recorder, request)
	if recorder.Code != http.StatusForbidden {
		t.Fatalf("Reviewer status=%d body=%s", recorder.Code, recorder.Body.String())
	}
	if recorder.Header().Get("Content-Type") != "application/problem+json" {
		t.Fatalf("unexpected content type %q", recorder.Header().Get("Content-Type"))
	}
}
