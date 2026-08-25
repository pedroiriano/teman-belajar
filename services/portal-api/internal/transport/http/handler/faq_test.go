package handler

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"teman-belajar-api/internal/domain/faq"
	"teman-belajar-api/internal/transport/http/middleware"
)

type faqHandlerRepository struct{}

func (faqHandlerRepository) CreateCategory(context.Context, *faq.Category, string) error { return nil }
func (faqHandlerRepository) ListCategories(context.Context, bool) ([]faq.Category, error) {
	return []faq.Category{}, nil
}
func (faqHandlerRepository) ArchiveCategory(context.Context, string, string) error { return nil }
func (faqHandlerRepository) CategoryActive(context.Context, string) (bool, error)  { return true, nil }
func (faqHandlerRepository) CategoryHasLiveItems(context.Context, string) (bool, error) {
	return false, nil
}
func (faqHandlerRepository) CreateItem(context.Context, *faq.Item, string) error        { return nil }
func (faqHandlerRepository) UpdateItem(context.Context, *faq.Item, int64, string) error { return nil }
func (faqHandlerRepository) GetItem(context.Context, string) (*faq.Item, error) {
	return nil, faq.ErrNotFound
}
func (faqHandlerRepository) ListAdminItems(context.Context, faq.ListFilter) ([]faq.Item, int, error) {
	return []faq.Item{}, 0, nil
}
func (faqHandlerRepository) ListPublic(context.Context, string) ([]faq.PublicCategory, int, error) {
	return []faq.PublicCategory{}, 0, nil
}

func faqRequest(method, target, body, subject string, roles ...string) *http.Request {
	request := httptest.NewRequest(method, target, strings.NewReader(body))
	claims := middleware.CustomClaims{Subject: subject, RealmAccess: middleware.RealmAccess{Roles: roles}}
	return request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, claims))
}

func TestFAQHandlerRejectsMissingIdentityUnknownFieldsAndReviewerAuthorship(t *testing.T) {
	handler := NewFAQHandler(faq.NewService(faqHandlerRepository{}, nil))
	tests := []struct {
		name string
		req  *http.Request
		want int
	}{
		{"missing identity", httptest.NewRequest(http.MethodPost, "/api/v1/admin/faqs/items", strings.NewReader(`{}`)), http.StatusUnauthorized},
		{"unknown field", faqRequest(http.MethodPost, "/api/v1/admin/faqs/items", `{"unexpected":"value"}`, "editor", "Content Editor"), http.StatusUnprocessableEntity},
		{"Reviewer cannot author", faqRequest(http.MethodPost, "/api/v1/admin/faqs/items", `{"category_id":"ae71d253-fb04-4d35-8448-4b5a02bf8059","slug":"cara-memulai","question":"Bagaimana memulai?","answer":"Pilih program yang sesuai.","sort_order":1,"seo_title":"","meta_description":"","indexable":true}`, "reviewer", "Reviewer"), http.StatusForbidden},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.Items(recorder, test.req)
			if recorder.Code != test.want {
				t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
			}
		})
	}
}

func TestFAQPublicResponseIsEmptyArrayNotNull(t *testing.T) {
	recorder := httptest.NewRecorder()
	NewFAQHandler(faq.NewService(faqHandlerRepository{}, nil)).PublicList(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/faqs", nil))
	if recorder.Code != http.StatusOK || !strings.Contains(recorder.Body.String(), `"data":[]`) {
		t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}

func TestFAQPublicRejectsUnsupportedQueryParameters(t *testing.T) {
	recorder := httptest.NewRecorder()
	NewFAQHandler(faq.NewService(faqHandlerRepository{}, nil)).PublicList(recorder, httptest.NewRequest(http.MethodGet, "/api/v1/faqs?raw_filter=status%3Ddraft", nil))
	if recorder.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status=%d body=%s", recorder.Code, recorder.Body.String())
	}
}
