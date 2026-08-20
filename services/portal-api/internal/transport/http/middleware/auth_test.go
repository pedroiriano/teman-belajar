package middleware

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/coreos/go-oidc/v3/oidc"
)

// MockVerifier allows us to mock the OIDC verifier
type MockVerifier struct {
	VerifyFunc func(ctx context.Context, rawIDToken string) (*oidc.IDToken, error)
}

func (m *MockVerifier) Verify(ctx context.Context, rawIDToken string) (*oidc.IDToken, error) {
	return m.VerifyFunc(ctx, rawIDToken)
}

// Since oidc.IDToken is a struct containing unexported fields,
// we actually test the middleware HTTP logic by mocking it out or just using jwt directly.
// But we designed our middleware to accept `OIDCVerifier`.
// To fully mock `*oidc.IDToken`, it's notoriously difficult because `oidc.IDToken` is concrete.
// Instead, we will test the HTTP status codes by simulating the error returns.
func TestAuthMiddleware_MissingToken(t *testing.T) {
	verifier := &MockVerifier{
		VerifyFunc: func(ctx context.Context, rawIDToken string) (*oidc.IDToken, error) {
			return nil, errors.New("invalid token")
		},
	}

	config := AuthConfig{
		IssuerURL: "http://localhost:8081/realms/teman-belajar",
		Audience:  "teman-belajar-api",
	}

	middleware := AuthMiddleware(verifier, config)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}
}

func TestAuthMiddleware_InvalidToken(t *testing.T) {
	verifier := &MockVerifier{
		VerifyFunc: func(ctx context.Context, rawIDToken string) (*oidc.IDToken, error) {
			return nil, errors.New("token signature invalid or expired")
		},
	}

	config := AuthConfig{
		IssuerURL: "http://localhost:8081/realms/teman-belajar",
		Audience:  "teman-belajar-api",
	}

	middleware := AuthMiddleware(verifier, config)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-string")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("Expected 401, got %d", rr.Code)
	}
}

func TestAuthMiddleware_UnavailableVerifierReturnsServiceUnavailable(t *testing.T) {
	config := AuthConfig{
		IssuerURL: "http://localhost:8081/realms/teman-belajar",
		Audience:  "teman-belajar-api",
	}

	nextCalled := false
	middleware := AuthMiddleware(nil, config)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest("GET", "/", nil)
	req.Header.Set("Authorization", "Bearer token-that-must-not-be-verified")
	rr := httptest.NewRecorder()

	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Errorf("Expected 503, got %d", rr.Code)
	}
	if nextCalled {
		t.Error("Expected protected handler not to be called")
	}
}

// We rely on integration tests or manual tests to verify the claims decoding
// and role validation since we can't easily mock *oidc.IDToken internal state.
