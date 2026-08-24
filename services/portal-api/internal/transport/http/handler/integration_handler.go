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

func writeProblemDetails(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"type":   "about:blank",
		"title":  title,
		"status": status,
		"detail": detail,
	})
}

// HandleMoodleEventIngest handles POST /api/v1/internal/moodle/events.
// Authentication is enforced by the HMAC middleware wrapping this handler.
func (h *IntegrationHandler) HandleMoodleEventIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeProblemDetails(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Only POST is accepted")
		return
	}

	ct := r.Header.Get("Content-Type")
	if ct != "application/json" {
		writeProblemDetails(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", "Content-Type must be application/json")
		return
	}

	var envelope integration.EventEnvelope
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&envelope); err != nil {
		writeProblemDetails(w, http.StatusUnprocessableEntity, "Unprocessable Entity", "Invalid JSON: "+err.Error())
		return
	}

	// Check for trailing JSON payload
	if decoder.More() {
		writeProblemDetails(w, http.StatusUnprocessableEntity, "Unprocessable Entity", "Trailing JSON document detected")
		return
	}

	result, err := h.eventService.IngestEvent(r.Context(), &envelope)
	if err != nil {
		writeProblemDetails(w, http.StatusUnprocessableEntity, "Unprocessable Entity", err.Error())
		return
	}

	switch result {
	case integrationapp.IngestAccepted:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"status":   "accepted",
			"event_id": envelope.EventID,
		})
	case integrationapp.IngestDuplicate:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"status":   "duplicate",
			"event_id": envelope.EventID,
		})
	case integrationapp.IngestCollision:
		writeProblemDetails(w, http.StatusConflict, "Conflict", "event_id collision: same ID with different content")
	}
}
