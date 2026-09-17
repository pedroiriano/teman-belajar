package handler

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/enrollment"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxEnrollmentRequestBytes = 64 * 1024

type EnrollmentHandler struct {
	svc       *enrollment.Service
	auditRepo audit.Repository
}

func NewEnrollmentHandler(svc *enrollment.Service, auditRepo audit.Repository) *EnrollmentHandler {
	return &EnrollmentHandler{svc: svc, auditRepo: auditRepo}
}

func (h *EnrollmentHandler) error(w http.ResponseWriter, err error) {
	log.Printf("[enrollment-handler] error: %v", err)
	switch {
	case errors.Is(err, enrollment.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Enrollment not found")
	case errors.Is(err, enrollment.ErrProgramNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Training program not found")
	case errors.Is(err, enrollment.ErrCohortNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Cohort not found for this training program")
	case errors.Is(err, enrollment.ErrAlreadyApplied):
		respondProblem(w, http.StatusConflict, "Conflict", "Anda sudah mendaftar pada program pelatihan ini")
	case errors.Is(err, enrollment.ErrInvalidStatus):
		respondProblem(w, http.StatusConflict, "Conflict", err.Error())
	case errors.Is(err, enrollment.ErrValidation):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
	case errors.Is(err, enrollment.ErrForbidden):
		respondProblem(w, http.StatusForbidden, "Forbidden", "Operation forbidden")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Unable to process enrollment operation")
	}
}

func enrollmentClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}

// Apply handles POST /api/v1/learning/me/training-programs/{slug}/enroll
func (h *EnrollmentHandler) Apply(w http.ResponseWriter, r *http.Request) {
	claims, ok := enrollmentClaims(w, r)
	if !ok {
		return
	}

	slug := r.PathValue("slug")
	if strings.TrimSpace(slug) == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Program slug is required")
		return
	}

	var in enrollment.ApplyInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxEnrollmentRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&in); err != nil && !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid request body")
		return
	}

	userName := claims.Name
	if userName == "" {
		userName = claims.PreferredUsername
	}
	if userName == "" {
		userName = claims.Subject
	}

	res, err := h.svc.Apply(r.Context(), claims.Subject, userName, claims.Email, slug, in)
	if err != nil {
		h.error(w, err)
		return
	}

	if h.auditRepo != nil {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Request-ID")
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: claims.Subject,
			Action:      "TRAINING_PROGRAM_ENROLLMENT_APPLIED",
			Module:      "training",
			TargetType:  "training_program_enrollment",
			TargetID:    res.ID,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusCreated, res)
}

// MyStatus handles GET /api/v1/learning/me/training-programs/{slug}/enrollment-status
func (h *EnrollmentHandler) MyStatus(w http.ResponseWriter, r *http.Request) {
	claims, ok := enrollmentClaims(w, r)
	if !ok {
		return
	}

	slug := r.PathValue("slug")
	if strings.TrimSpace(slug) == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Program slug is required")
		return
	}

	res, err := h.svc.MyStatus(r.Context(), claims.Subject, slug)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, res)
}

// AdminList handles GET /api/v1/admin/enrollments
func (h *EnrollmentHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	page, pageSize := 1, 10
	if p := r.URL.Query().Get("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val >= 1 {
			page = val
		}
	}
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val >= 1 && val <= 100 {
			pageSize = val
		}
	}

	filter := enrollment.Filter{
		Query:       strings.TrimSpace(r.URL.Query().Get("q")),
		ProgramSlug: strings.TrimSpace(r.URL.Query().Get("program_slug")),
		Status:      strings.TrimSpace(r.URL.Query().Get("status")),
		Page:        page,
		PageSize:    pageSize,
	}

	resp, err := h.svc.ListAdmin(r.Context(), filter)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, resp)
}

// AdminConfirm handles POST /api/v1/admin/enrollments/{id}/confirm
func (h *EnrollmentHandler) AdminConfirm(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if strings.TrimSpace(id) == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Enrollment ID is required")
		return
	}

	claims, _ := middleware.ClaimsFromContext(r.Context())
	confirmedBy := claims.PreferredUsername
	if confirmedBy == "" {
		confirmedBy = claims.Subject
	}
	if confirmedBy == "" {
		confirmedBy = "admin"
	}

	res, err := h.svc.Confirm(r.Context(), id, confirmedBy)
	if err != nil {
		h.error(w, err)
		return
	}

	if h.auditRepo != nil {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Request-ID")
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: claims.Subject,
			Action:      "TRAINING_PROGRAM_ENROLLMENT_CONFIRMED",
			Module:      "training",
			TargetType:  "training_program_enrollment",
			TargetID:    id,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusOK, res)
}

// AdminReject handles POST /api/v1/admin/enrollments/{id}/reject
func (h *EnrollmentHandler) AdminReject(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if strings.TrimSpace(id) == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Enrollment ID is required")
		return
	}

	var in enrollment.RejectInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxEnrollmentRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&in); err != nil && !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid request body")
		return
	}

	claims, _ := middleware.ClaimsFromContext(r.Context())
	confirmedBy := claims.PreferredUsername
	if confirmedBy == "" {
		confirmedBy = claims.Subject
	}
	if confirmedBy == "" {
		confirmedBy = "admin"
	}

	res, err := h.svc.Reject(r.Context(), id, confirmedBy, in)
	if err != nil {
		h.error(w, err)
		return
	}

	if h.auditRepo != nil {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Request-ID")
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: claims.Subject,
			Action:      "TRAINING_PROGRAM_ENROLLMENT_REJECTED",
			Module:      "training",
			TargetType:  "training_program_enrollment",
			TargetID:    id,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusOK, res)
}

// AdminManual handles POST /api/v1/admin/enrollments/manual
func (h *EnrollmentHandler) AdminManual(w http.ResponseWriter, r *http.Request) {
	var in enrollment.ManualEnrollInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxEnrollmentRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&in); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid request body")
		return
	}

	claims, _ := middleware.ClaimsFromContext(r.Context())
	confirmedBy := claims.PreferredUsername
	if confirmedBy == "" {
		confirmedBy = claims.Subject
	}
	if confirmedBy == "" {
		confirmedBy = "admin"
	}

	res, err := h.svc.ManualEnroll(r.Context(), in, confirmedBy)
	if err != nil {
		h.error(w, err)
		return
	}

	if h.auditRepo != nil {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Request-ID")
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: claims.Subject,
			Action:      "TRAINING_PROGRAM_ENROLLMENT_MANUAL",
			Module:      "training",
			TargetType:  "training_program_enrollment",
			TargetID:    res.ID,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusCreated, res)
}
