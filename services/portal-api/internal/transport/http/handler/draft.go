package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/draft"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxDraftRequestBytes = draft.MaxPayloadSize + 16*1024

type DraftHandler struct{ svc *draft.Service }

func NewDraftHandler(svc *draft.Service) *DraftHandler { return &DraftHandler{svc: svc} }

func (h *DraftHandler) List(w http.ResponseWriter, r *http.Request) {
	claims, ok := draftWriterClaims(w, r)
	if !ok {
		return
	}
	formKey := strings.TrimSpace(r.URL.Query().Get("form_key"))
	if formKey == "" {
		respondDraftProblem(w, r, http.StatusUnprocessableEntity, "DRAFT_VALIDATION_FAILED", "Validation failed", "form_key is required", nil)
		return
	}
	filter := draft.ListFilter{FormKey: formKey, EntityType: strings.TrimSpace(r.URL.Query().Get("entity_type"))}
	if entityID := strings.TrimSpace(r.URL.Query().Get("entity_id")); entityID != "" {
		if _, err := uuid.Parse(entityID); err != nil {
			respondDraftProblem(w, r, http.StatusUnprocessableEntity, "DRAFT_VALIDATION_FAILED", "Validation failed", "entity_id must be a UUID", nil)
			return
		}
		filter.EntityID = &entityID
	}
	items, err := h.svc.List(r.Context(), claims.Subject, filter)
	if err != nil {
		h.respondError(w, r, err, nil)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, http.StatusOK, map[string]any{"data": items, "limit": draft.ListLimit})
}

func (h *DraftHandler) Get(w http.ResponseWriter, r *http.Request) {
	claims, ok := draftWriterClaims(w, r)
	if !ok {
		return
	}
	value, err := h.svc.Get(r.Context(), claims.Subject, r.PathValue("draftKey"))
	if err != nil {
		h.respondError(w, r, err, nil)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, http.StatusOK, value)
}

func (h *DraftHandler) Save(w http.ResponseWriter, r *http.Request) {
	claims, ok := draftWriterClaims(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxDraftRequestBytes)
	var input draft.SaveInput
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		respondDraftProblem(w, r, http.StatusUnprocessableEntity, "DRAFT_VALIDATION_FAILED", "Validation failed", draftDecodeDetail(err), nil)
		return
	}
	if err := ensureJSONEOF(decoder); err != nil {
		respondDraftProblem(w, r, http.StatusUnprocessableEntity, "DRAFT_VALIDATION_FAILED", "Validation failed", "Request contains trailing JSON data", nil)
		return
	}
	input.DraftKey = r.PathValue("draftKey")
	value, err := h.svc.Save(r.Context(), claims.Subject, input)
	if err != nil {
		h.respondError(w, r, err, value)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, http.StatusOK, value)
}

func (h *DraftHandler) RecordRecovery(w http.ResponseWriter, r *http.Request) {
	claims, ok := draftWriterClaims(w, r)
	if !ok {
		return
	}
	if err := h.svc.RecordRecovery(r.Context(), claims.Subject, r.PathValue("draftKey")); err != nil {
		h.respondError(w, r, err, nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DraftHandler) Delete(w http.ResponseWriter, r *http.Request) {
	claims, ok := draftWriterClaims(w, r)
	if !ok {
		return
	}
	reason := draft.DeleteReason(r.URL.Query().Get("reason"))
	if err := h.svc.Delete(r.Context(), claims.Subject, r.PathValue("draftKey"), reason); err != nil {
		h.respondError(w, r, err, nil)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *DraftHandler) respondError(w http.ResponseWriter, r *http.Request, err error, current *draft.FormDraft) {
	switch {
	case errors.Is(err, draft.ErrNotFound):
		respondDraftProblem(w, r, http.StatusNotFound, "DRAFT_NOT_FOUND", "Not found", "Draft was not found", nil)
	case errors.Is(err, draft.ErrConflict):
		if conflict := new(draft.Conflict); errors.As(err, &conflict) && conflict.Current != nil {
			current = conflict.Current
		}
		respondDraftProblem(w, r, http.StatusConflict, "DRAFT_REVISION_CONFLICT", "Draft conflict", "A newer server draft exists; review it before replacing content", current)
	case errors.Is(err, draft.ErrUnsupported), errors.Is(err, draft.ErrValidation), errors.Is(err, draft.ErrIdentityLocked):
		respondDraftProblem(w, r, http.StatusUnprocessableEntity, "DRAFT_VALIDATION_FAILED", "Validation failed", err.Error(), nil)
	default:
		respondDraftProblem(w, r, http.StatusInternalServerError, "DRAFT_UNAVAILABLE", "Draft service unavailable", "The draft could not be processed", nil)
	}
}

func draftWriterClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok {
		respondDraftProblem(w, r, http.StatusUnauthorized, "DRAFT_UNAUTHORIZED", "Unauthorized", "Missing verified identity", nil)
		return middleware.CustomClaims{}, false
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		respondDraftProblem(w, r, http.StatusForbidden, "DRAFT_WRITE_FORBIDDEN", "Forbidden", "Content Editor role required", nil)
		return middleware.CustomClaims{}, false
	}
	return claims, true
}

func respondDraftProblem(w http.ResponseWriter, r *http.Request, status int, code, title, detail string, current *draft.FormDraft) {
	traceID := strings.TrimSpace(r.Header.Get("X-Request-ID"))
	if _, err := uuid.Parse(traceID); err != nil {
		traceID = uuid.NewString()
	}
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Request-ID", traceID)
	w.WriteHeader(status)
	body := map[string]any{
		"type":  "https://teman-belajar.local/problems/" + strings.ToLower(code),
		"title": title, "status": status, "detail": detail, "code": code, "trace_id": traceID,
	}
	if current != nil {
		body["current_draft"] = current
	}
	_ = json.NewEncoder(w).Encode(body) // #nosec G104 -- response writer error after commit is non-actionable
}

func draftDecodeDetail(err error) string {
	var maxErr *http.MaxBytesError
	if errors.As(err, &maxErr) {
		return "Draft request exceeds the maximum size"
	}
	return "Invalid draft request: " + fmt.Sprint(err)
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var extra any
	err := decoder.Decode(&extra)
	if errors.Is(err, io.EOF) {
		return nil
	}
	if err == nil {
		return errors.New("trailing JSON value")
	}
	return err
}
