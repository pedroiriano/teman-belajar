package handler

import (
	"encoding/json"
	"net/http"

	"teman-belajar-api/internal/transport/http/middleware"
)

type UserProfile struct {
	ID          string `json:"id"`
	Subject     string `json:"subject"`
	DisplayName string `json:"display_name"`
	Locale      string `json:"locale"`
}

func GetMe(w http.ResponseWriter, r *http.Request) {
	claimsVal := r.Context().Value(middleware.ClaimsContextKey)
	if claimsVal == nil {
		http.Error(w, `{"type":"about:blank","title":"Unauthorized","status":401,"detail":"Missing claims"}`, http.StatusUnauthorized)
		return
	}

	claims, ok := claimsVal.(middleware.CustomClaims)
	if !ok {
		http.Error(w, `{"type":"about:blank","title":"Internal Server Error","status":500,"detail":"Invalid claims format"}`, http.StatusInternalServerError)
		return
	}

	// In Keycloak, 'sub' is typically the unique ID. 'name' or 'preferred_username' provides display name.
	displayName := claims.Name
	if displayName == "" {
		displayName = claims.PreferredUsername
	}

	profile := UserProfile{
		ID:          claims.Subject,
		Subject:     claims.Subject,
		DisplayName: displayName,
		Locale:      "id", // Hardcoded for now as per minimal response
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(profile) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}
