package handler

import (
	"encoding/json"
	"io"
	"log"
	"mime"
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
	err := json.NewEncoder(w).Encode(map[string]interface{}{
		"type":   "about:blank",
		"title":  title,
		"status": status,
		"detail": detail,
	})
	if err != nil {
		log.Printf("failed to write problem details response: %v", err)
	}
}

// HandleMoodleEventIngest handles POST /api/v1/internal/moodle/events.
// Authentication is enforced by the HMAC middleware wrapping this handler.
func (h *IntegrationHandler) HandleMoodleEventIngest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeProblemDetails(w, http.StatusMethodNotAllowed, "Method Not Allowed", "Only POST is accepted")
		return
	}

	ct := r.Header.Get("Content-Type")
	mediaType, _, err := mime.ParseMediaType(ct)
	if err != nil || mediaType != "application/json" {
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

	// Check for trailing JSON payload via second decode
	var second map[string]interface{}
	if err := decoder.Decode(&second); err != io.EOF {
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
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "accepted",
			"event_id": envelope.EventID,
		}); err != nil {
			log.Printf("failed to write accepted response: %v", err)
		}
	case integrationapp.IngestDuplicate:
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusAccepted)
		if err := json.NewEncoder(w).Encode(map[string]interface{}{
			"status":   "duplicate",
			"event_id": envelope.EventID,
		}); err != nil {
			log.Printf("failed to write duplicate response: %v", err)
		}
	case integrationapp.IngestCollision:
		writeProblemDetails(w, http.StatusConflict, "Conflict", "event_id collision: same ID with different content")
	}
}
