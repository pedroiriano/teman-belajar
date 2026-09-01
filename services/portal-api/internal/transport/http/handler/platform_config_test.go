package handler

import (
	"context"
	"database/sql"
	"net/http/httptest"
	"strings"
	"testing"

	application "teman-belajar-api/internal/application/platformconfig"
	"teman-belajar-api/internal/domain/media"
	domain "teman-belajar-api/internal/domain/platformconfig"
	"teman-belajar-api/internal/transport/http/middleware"
)

type handlerConfigRepository struct{ saves int }

func (*handlerConfigRepository) GetState(context.Context, bool) (domain.State, error) {
	return domain.State{}, nil
}
func (*handlerConfigRepository) GetPublished(context.Context) (*domain.Revision, error) {
	return nil, sql.ErrNoRows
}
func (repository *handlerConfigRepository) SaveDraft(context.Context, int64, domain.Config, string) (*domain.Revision, error) {
	repository.saves++
	return &domain.Revision{Version: 1}, nil
}
func (*handlerConfigRepository) Publish(context.Context, int64, string) (*domain.Revision, error) {
	return &domain.Revision{Version: 1}, nil
}
func (*handlerConfigRepository) Rollback(context.Context, int64, int64, string) (*domain.Revision, error) {
	return &domain.Revision{Version: 2}, nil
}

type handlerMediaReader struct{}

func (handlerMediaReader) GetAssetByID(context.Context, string) (*media.MediaAsset, error) {
	return nil, sql.ErrNoRows
}

func TestPlatformConfigurationDenyByDefaultAndSafeFallback(t *testing.T) {
	repository := &handlerConfigRepository{}
	handler := NewPlatformConfigHandler(application.NewService(repository, handlerMediaReader{}, nil), nil)
	request := httptest.NewRequest("GET", "/api/v1/admin/platform-configuration", nil)
	response := httptest.NewRecorder()
	handler.State(response, request)
	if response.Code != 403 {
		t.Fatalf("deny code=%d", response.Code)
	}

	request = httptest.NewRequest("GET", "/api/v1/platform-configuration", nil)
	response = httptest.NewRecorder()
	handler.Public(response, request)
	if response.Code != 200 || !strings.Contains(response.Body.String(), `"source":"fallback"`) || strings.Contains(response.Body.String(), "database") {
		t.Fatalf("fallback code=%d body=%s", response.Code, response.Body.String())
	}
}

func TestPlatformConfigurationRejectsUnknownPayloadKey(t *testing.T) {
	repository := &handlerConfigRepository{}
	handler := NewPlatformConfigHandler(application.NewService(repository, handlerMediaReader{}, nil), nil)
	request := httptest.NewRequest("PUT", "/api/v1/admin/platform-configuration/draft", strings.NewReader(`{"expected_version":0,"config":{"identity":{"tagline":"A"}},"secret":"x"}`))
	claims := middleware.CustomClaims{Subject: "administrator", RealmAccess: middleware.RealmAccess{Roles: []string{"Portal Administrator"}}}
	request = request.WithContext(context.WithValue(request.Context(), middleware.ClaimsContextKey, claims))
	response := httptest.NewRecorder()
	handler.SaveDraft(response, request)
	if response.Code != 422 || repository.saves != 0 {
		t.Fatalf("code=%d saves=%d", response.Code, repository.saves)
	}
}
