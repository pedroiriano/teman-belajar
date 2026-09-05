package handler

import (
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"log"
	"mime"
	"net/http"
	"strconv"

	integrationapp "teman-belajar-api/internal/application/integration"
	"teman-belajar-api/internal/domain/integration"
	"teman-belajar-api/internal/transport/http/middleware"
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

func writeJSONResponse(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("failed to write json response: %v", err)
	}
}

// HandleGetSummary handles GET /api/v1/admin/moodle/events/summary.
func (h *IntegrationHandler) HandleGetSummary(w http.ResponseWriter, r *http.Request) {
	counts, err := h.eventService.GetSummary(r.Context())
	if err != nil {
		writeProblemDetails(w, http.StatusInternalServerError, "Internal Server Error", "Failed to retrieve event summary")
		return
	}

	pending := counts["pending"]
	processing := counts["processing"]
	processed := counts["processed"]
	deadLetter := counts["dead_letter"]
	total := pending + processing + processed + deadLetter

	writeJSONResponse(w, http.StatusOK, map[string]interface{}{
		"pending":     pending,
		"processing":  processing,
		"processed":   processed,
		"dead_letter": deadLetter,
		"total":       total,
	})
}

// HandleListEvents handles GET /api/v1/admin/moodle/events.
func (h *IntegrationHandler) HandleListEvents(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query()
	status := query.Get("status")
	eventType := query.Get("event_type")

	limit := 20
	if rawLimit := query.Get("limit"); rawLimit != "" {
		if parsed, err := strconv.Atoi(rawLimit); err == nil && parsed > 0 {
			limit = parsed
			if limit > 100 {
				limit = 100
			}
		}
	}

	offset := 0
	if rawOffset := query.Get("offset"); rawOffset != "" {
		if parsed, err := strconv.Atoi(rawOffset); err == nil && parsed >= 0 {
			offset = parsed
		}
	}

	filter := integration.EventFilter{
		Status:    status,
		EventType: eventType,
		Limit:     limit,
		Offset:    offset,
	}

	items, total, err := h.eventService.ListEvents(r.Context(), filter)
	if err != nil {
		writeProblemDetails(w, http.StatusInternalServerError, "Internal Server Error", "Failed to list events")
		return
	}
	if items == nil {
		items = []*integration.InboxEvent{}
	}

	writeJSONResponse(w, http.StatusOK, map[string]interface{}{
		"items":  items,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// HandleGetEvent handles GET /api/v1/admin/moodle/events/{id}.
func (h *IntegrationHandler) HandleGetEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeProblemDetails(w, http.StatusBadRequest, "Bad Request", "Event ID is required")
		return
	}

	event, err := h.eventService.GetEvent(r.Context(), id)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeProblemDetails(w, http.StatusNotFound, "Not Found", "Event not found")
			return
		}
		writeProblemDetails(w, http.StatusInternalServerError, "Internal Server Error", "Failed to get event")
		return
	}

	writeJSONResponse(w, http.StatusOK, event)
}

// HandleRequeueEvent handles POST /api/v1/admin/moodle/events/{id}/requeue.
func (h *IntegrationHandler) HandleRequeueEvent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if id == "" {
		writeProblemDetails(w, http.StatusBadRequest, "Bad Request", "Event ID is required")
		return
	}

	actor := "admin"
	if claims, ok := middleware.ClaimsFromContext(r.Context()); ok && claims.Subject != "" {
		actor = claims.Subject
	}

	if err := h.eventService.RequeueEvent(r.Context(), id, actor); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			writeProblemDetails(w, http.StatusNotFound, "Not Found", "Event not found or not in dead_letter status")
			return
		}
		writeProblemDetails(w, http.StatusInternalServerError, "Internal Server Error", "Failed to requeue event")
		return
	}

	writeJSONResponse(w, http.StatusOK, map[string]interface{}{
		"status":   "requeued",
		"event_id": id,
	})
}

