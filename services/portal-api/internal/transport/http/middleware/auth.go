package middleware

import (
	"context"
	"errors"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/coreos/go-oidc/v3/oidc"
)

type contextKey string

const ClaimsContextKey = contextKey("user_claims")

type RealmAccess struct {
	Roles []string `json:"roles"`
}

type CustomClaims struct {
	Subject           string      `json:"sub"`
	PreferredUsername string      `json:"preferred_username"`
	Email             string      `json:"email"`
	GivenName         string      `json:"given_name"`
	FamilyName        string      `json:"family_name"`
	Name              string      `json:"name"`
	RealmAccess       RealmAccess `json:"realm_access"`
	Nbf               *int64      `json:"nbf"`
	Typ               string      `json:"typ"`
}

func ClaimsFromContext(ctx context.Context) (CustomClaims, bool) {
	claims, ok := ctx.Value(ClaimsContextKey).(CustomClaims)
	return claims, ok
}

type AuthConfig struct {
	IssuerURL     string
	Audience      string
	RequiredRoles []string
}

// OIDCVerifier interface allows mocking the OIDC verifier in tests
type OIDCVerifier interface {
	Verify(ctx context.Context, rawIDToken string) (*oidc.IDToken, error)
}

func AuthMiddleware(verifier OIDCVerifier, config AuthConfig) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if verifier == nil {
				log.Printf("Token verification unavailable: OIDC verifier is not initialized")
				http.Error(w, `{"type":"about:blank","title":"Service Unavailable","status":503,"detail":"Authentication service is temporarily unavailable"}`, http.StatusServiceUnavailable)
				return
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Missing Authorization header"}`, http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Invalid Authorization header format"}`, http.StatusUnauthorized)
				return
			}

			rawToken := parts[1]

			// Verify token signature, issuer, audience, exp, nbf automatically by go-oidc Verifier
			idToken, err := verifier.Verify(r.Context(), rawToken)
			if err != nil {
				log.Printf("Token verification failed: %v", err)
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Invalid or expired token"}`, http.StatusUnauthorized)
				return
			}

			var claims CustomClaims
			if err := idToken.Claims(&claims); err != nil {
				log.Printf("Failed to parse claims: %v", err)
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Invalid token claims"}`, http.StatusUnauthorized)
				return
			}

			if claims.Typ != "" && claims.Typ != "Bearer" {
				log.Printf("Invalid token type: %s", claims.Typ)
				http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Invalid token type"}`, http.StatusUnauthorized)
				return
			}

			if claims.Nbf != nil {
				nbfTime := time.Unix(*claims.Nbf, 0)
				if time.Now().Before(nbfTime) {
					log.Printf("Token not valid yet. nbf: %v", nbfTime)
					http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Token not yet valid"}`, http.StatusUnauthorized)
					return
				}
			}

			// Verify roles if any required
			if len(config.RequiredRoles) > 0 {
				hasRole := false
				for _, requiredRole := range config.RequiredRoles {
					for _, userRole := range claims.RealmAccess.Roles {
						if userRole == requiredRole {
							hasRole = true
							break
						}
					}
					if hasRole {
						break
					}
				}

				if !hasRole {
					http.Error(w, `{"type":"about:blank","title":"Forbidden","status":403,"detail":"Insufficient permissions"}`, http.StatusForbidden)
					return
				}
			}

			// Token is valid and roles are met. Inject claims into context.
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// InitVerifier initializes a real go-oidc verifier.
func InitVerifier(ctx context.Context, issuerURL, audience string) (OIDCVerifier, error) {
	// For production, we want to retry fetching the provider config a few times
	// in case Keycloak is still starting up.
	var provider *oidc.Provider
	var err error
	for i := 0; i < 5; i++ {
		provider, err = oidc.NewProvider(ctx, issuerURL)
		if err == nil {
			break
		}
		time.Sleep(2 * time.Second)
	}
	if err != nil {
		return nil, errors.New("failed to initialize OIDC provider: " + err.Error())
	}

	oidcConfig := &oidc.Config{
		ClientID: audience, // Validates audience (aud)
	}
	return provider.Verifier(oidcConfig), nil
}
