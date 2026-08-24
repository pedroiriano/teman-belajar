package middleware

import (
	"context"
	"crypto/rand"
	"crypto/rsa"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
	"github.com/go-jose/go-jose/v4"
	"github.com/go-jose/go-jose/v4/jwt"
)

func setupMockIdP(t *testing.T) (*httptest.Server, *rsa.PrivateKey) {
	privateKey, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatalf("failed to generate key: %v", err)
	}

	mux := http.NewServeMux()
	var serverURL string

	mux.HandleFunc("/.well-known/openid-configuration", func(w http.ResponseWriter, r *http.Request) {
		config := map[string]interface{}{
			"issuer":                                serverURL,
			"jwks_uri":                              serverURL + "/keys",
			"id_token_signing_alg_values_supported": []string{"RS256"},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(config) // #nosec G104
	})

	mux.HandleFunc("/keys", func(w http.ResponseWriter, r *http.Request) {
		jwks := jose.JSONWebKeySet{
			Keys: []jose.JSONWebKey{
				{
					Key:       &privateKey.PublicKey,
					KeyID:     "test-key",
					Algorithm: "RS256",
					Use:       "sig",
				},
			},
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(jwks) // #nosec G104
	})

	server := httptest.NewServer(mux)
	serverURL = server.URL

	return server, privateKey
}

func signJWT(privateKey *rsa.PrivateKey, claims interface{}) (string, error) {
	key := jose.SigningKey{Algorithm: jose.RS256, Key: privateKey}
	opts := (&jose.SignerOptions{}).WithType("JWT").WithHeader("kid", "test-key")
	signer, err := jose.NewSigner(key, opts)
	if err != nil {
		return "", err
	}

	return jwt.Signed(signer).Claims(claims).Serialize()
}

func TestAuthMiddlewareIntegration(t *testing.T) {
	mockIdP, privateKey := setupMockIdP(t)
	defer mockIdP.Close()

	ctx := context.Background()
	provider, err := oidc.NewProvider(ctx, mockIdP.URL)
	if err != nil {
		t.Fatalf("Failed to create provider: %v", err)
	}

	verifier := provider.Verifier(&oidc.Config{
		ClientID: "teman-belajar-api",
	})

	config := AuthConfig{
		IssuerURL:     mockIdP.URL,
		Audience:      "teman-belajar-api",
		RequiredRoles: []string{"Portal Administrator"},
	}

	middleware := AuthMiddleware(verifier, config)
	handler := middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	tests := []struct {
		name           string
		setupHeader    func() string
		expectedStatus int
	}{
		{
			name: "missing token",
			setupHeader: func() string {
				return ""
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "malformed token",
			setupHeader: func() string {
				return "Bearer not.a.jwt"
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "invalid signature",
			setupHeader: func() string {
				claims := map[string]interface{}{
					"iss": mockIdP.URL,
					"aud": "teman-belajar-api",
					"exp": time.Now().Add(time.Hour).Unix(),
				}
				// Sign with a different key
				wrongKey, _ := rsa.GenerateKey(rand.Reader, 2048)
				token, _ := signJWT(wrongKey, claims)
				return "Bearer " + token
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "expired token",
			setupHeader: func() string {
				claims := map[string]interface{}{
					"iss": mockIdP.URL,
					"aud": "teman-belajar-api",
					"exp": time.Now().Add(-1 * time.Hour).Unix(),
				}
				token, _ := signJWT(privateKey, claims)
				return "Bearer " + token
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "wrong issuer",
			setupHeader: func() string {
				claims := map[string]interface{}{
					"iss": "http://wrong-issuer.com",
					"aud": "teman-belajar-api",
					"exp": time.Now().Add(time.Hour).Unix(),
				}
				token, _ := signJWT(privateKey, claims)
				return "Bearer " + token
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "wrong audience",
			setupHeader: func() string {
				claims := map[string]interface{}{
					"iss": mockIdP.URL,
					"aud": "wrong-audience",
					"exp": time.Now().Add(time.Hour).Unix(),
				}
				token, _ := signJWT(privateKey, claims)
				return "Bearer " + token
			},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "authenticated user tanpa role",
			setupHeader: func() string {
				claims := map[string]interface{}{
					"iss": mockIdP.URL,
					"aud": "teman-belajar-api",
					"exp": time.Now().Add(time.Hour).Unix(),
					"realm_access": map[string]interface{}{
						"roles": []string{"Learner"},
					},
				}
				token, _ := signJWT(privateKey, claims)
				return "Bearer " + token
			},
			expectedStatus: http.StatusForbidden,
		},
		{
			name: "valid token",
			setupHeader: func() string {
				claims := map[string]interface{}{
					"iss": mockIdP.URL,
					"aud": "teman-belajar-api",
					"exp": time.Now().Add(time.Hour).Unix(),
					"realm_access": map[string]interface{}{
						"roles": []string{"Portal Administrator"},
					},
				}
				token, _ := signJWT(privateKey, claims)
				return "Bearer " + token
			},
			expectedStatus: http.StatusOK,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", "/", nil)
			header := tc.setupHeader()
			if header != "" {
				req.Header.Set("Authorization", header)
			}

			rr := httptest.NewRecorder()
			handler.ServeHTTP(rr, req)

			if rr.Code != tc.expectedStatus {
				t.Errorf("expected status %d, got %d", tc.expectedStatus, rr.Code)
			}
		})
	}
}
