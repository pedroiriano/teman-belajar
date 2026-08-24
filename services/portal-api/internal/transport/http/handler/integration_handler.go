package handler

import (
	"encoding/json"
	"net/http"

	integrationapp "teman-belajar-api/internal/application/integration"
	"teman-belajar-api/internal/domain/integration"
)

// IntegrationHandler handles Moodle event ingestion HTTP requests.
type IntegrationHandler struct {
	eventService *integrationapp.EventService
}

// NewIntegrationHandler creates a new IntegrationHandler.
func NewIntegrationHandler(eventService *integrationapp.EventService) *IntegrationHandler {
	return &IntegrationHandler{eventService: eventService}
}

// HandleMoodleEventIngest handles POST /api/v1/internal/moodle/events.
// Authentication is enforced by the HMAC middleware wrapping this handler.
func (h *IntegrationHandler) HandleMoodleEventIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, `{"type":"about:blank","title":"Method Not Allowed","status":405,"detail":"Only POST is accepted"}`, http.StatusMethodNotAllowed)
		return
	}

	ct := r.Header.Get("Content-Type")
	if ct != "application/json" {
		http.Error(w, `{"type":"about:blank","title":"Unsupported Media Type","status":415,"detail":"Content-Type must be application/json"}`, http.StatusUnsupportedMediaType)
		return
	}

	var envelope integration.EventEnvelope
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&envelope); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unprocessable Entity",
			"status": 422,
			"detail": "Invalid JSON: " + err.Error(),
		})
		return
	}

	result, err := h.eventService.IngestEvent(r.Context(), &envelope)
	if err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusUnprocessableEntity)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unprocessable Entity",
			"status": 422,
			"detail": err.Error(),
		})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	switch result {
	case integrationapp.IngestAccepted:
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"status":   "accepted",
			"event_id": envelope.EventID,
		})
	case integrationapp.IngestDuplicate:
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"status":   "duplicate",
			"event_id": envelope.EventID,
		})
	case integrationapp.IngestCollision:
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Conflict",
			"status": 409,
			"detail": "event_id collision: same ID with different content",
		})
	}
}
