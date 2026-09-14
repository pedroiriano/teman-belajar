package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/coursereview"
	"teman-belajar-api/internal/transport/http/middleware"
)

const maxCourseReviewRequestBytes = 64 * 1024

type CourseReviewHandler struct {
	svc       *coursereview.Service
	auditRepo audit.Repository
}

func NewCourseReviewHandler(svc *coursereview.Service, auditRepo audit.Repository) *CourseReviewHandler {
	return &CourseReviewHandler{svc: svc, auditRepo: auditRepo}
}

func (h *CourseReviewHandler) error(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, coursereview.ErrNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Review not found")
	case errors.Is(err, coursereview.ErrProgramNotFound):
		respondProblem(w, http.StatusNotFound, "Not Found", "Training program not found")
	case errors.Is(err, coursereview.ErrInvalidRating), errors.Is(err, coursereview.ErrInvalidContent), errors.Is(err, coursereview.ErrInvalidStatus):
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", err.Error())
	case errors.Is(err, coursereview.ErrUnauthorized):
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Authentication required")
	default:
		respondProblem(w, http.StatusInternalServerError, "Internal Error", "Unable to process review operation")
	}
}

func reviewClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		respondProblem(w, http.StatusUnauthorized, "Unauthorized", "Missing validated identity")
		return claims, false
	}
	return claims, true
}

func (h *CourseReviewHandler) PublicList(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	page, pageSize := 1, 10
	var ratingFilter *int

	if p := r.URL.Query().Get("page"); p != "" {
		if val, err := strconv.Atoi(p); err == nil && val >= 1 {
			page = val
		}
	}
	if ps := r.URL.Query().Get("page_size"); ps != "" {
		if val, err := strconv.Atoi(ps); err == nil && val >= 1 && val <= 50 {
			pageSize = val
		}
	}
	if rt := r.URL.Query().Get("rating"); rt != "" {
		if val, err := strconv.Atoi(rt); err == nil && val >= 1 && val <= 5 {
			ratingFilter = &val
		}
	}

	filter := coursereview.ListFilter{
		Rating:   ratingFilter,
		Page:     page,
		PageSize: pageSize,
		SortBy:   r.URL.Query().Get("sort"),
	}

	result, err := h.svc.GetPublicReviews(r.Context(), slug, filter)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *CourseReviewHandler) GetMyReview(w http.ResponseWriter, r *http.Request) {
	claims, ok := reviewClaims(w, r)
	if !ok {
		return
	}
	slug := r.PathValue("slug")
	review, err := h.svc.GetMyReview(r.Context(), claims.Subject, slug)
	if err != nil {
		if errors.Is(err, coursereview.ErrNotFound) {
			respondProblem(w, http.StatusNotFound, "Not Found", "No review found for current user")
			return
		}
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, review)
}

func (h *CourseReviewHandler) SubmitReview(w http.ResponseWriter, r *http.Request) {
	claims, ok := reviewClaims(w, r)
	if !ok {
		return
	}
	slug := r.PathValue("slug")

	var input coursereview.ReviewInput
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCourseReviewRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&input); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid request body")
		return
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Request body contains trailing data")
		return
	}

	authorName := strings.TrimSpace(claims.Name)
	if authorName == "" {
		authorName = strings.TrimSpace(claims.PreferredUsername)
	}
	if authorName == "" {
		authorName = "Pembelajar Teman Belajar"
	}

	review, err := h.svc.SubmitReview(r.Context(), claims.Subject, authorName, slug, input)
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
			Action:      "COURSE_REVIEW_SUBMITTED",
			Module:      "training",
			TargetType:  "course_review",
			TargetID:    review.ID,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusOK, review)
}

func (h *CourseReviewHandler) DeleteMyReview(w http.ResponseWriter, r *http.Request) {
	claims, ok := reviewClaims(w, r)
	if !ok {
		return
	}
	slug := r.PathValue("slug")
	if err := h.svc.DeleteMyReview(r.Context(), claims.Subject, slug); err != nil {
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
			Action:      "COURSE_REVIEW_DELETED",
			Module:      "training",
			TargetType:  "course_review",
			TargetID:    slug,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *CourseReviewHandler) AdminList(w http.ResponseWriter, r *http.Request) {
	page, pageSize := 1, 20
	var ratingFilter *int

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
	if rt := r.URL.Query().Get("rating"); rt != "" {
		if val, err := strconv.Atoi(rt); err == nil && val >= 1 && val <= 5 {
			ratingFilter = &val
		}
	}

	filter := coursereview.AdminFilter{
		ProgramSlug: r.URL.Query().Get("program_slug"),
		Status:      r.URL.Query().Get("status"),
		Rating:      ratingFilter,
		Query:       r.URL.Query().Get("q"),
		Page:        page,
		PageSize:    pageSize,
	}

	result, err := h.svc.ListAdminReviews(r.Context(), filter)
	if err != nil {
		h.error(w, err)
		return
	}

	respondJSON(w, http.StatusOK, result)
}

func (h *CourseReviewHandler) AdminUpdateStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	if strings.TrimSpace(id) == "" {
		respondProblem(w, http.StatusBadRequest, "Bad Request", "Review ID is required")
		return
	}

	var body struct {
		Status coursereview.Status `json:"status"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxCourseReviewRequestBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&body); err != nil {
		respondProblem(w, http.StatusUnprocessableEntity, "Validation Error", "Invalid request body")
		return
	}

	if err := h.svc.UpdateReviewStatus(r.Context(), id, body.Status); err != nil {
		h.error(w, err)
		return
	}

	claims, _ := middleware.ClaimsFromContext(r.Context())
	if h.auditRepo != nil {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Request-ID")
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: claims.Subject,
			Action:      "COURSE_REVIEW_MODERATED",
			Module:      "training",
			TargetType:  "course_review",
			TargetID:    id,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	respondJSON(w, http.StatusOK, map[string]any{
		"success": true,
		"id":      id,
		"status":  body.Status,
	})
}
