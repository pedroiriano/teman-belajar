package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"time"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/audit"
	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/transport/http/middleware"
)

type LearningHandler struct {
	svc       *learning.Service
	auditRepo audit.Repository
}

func NewLearningHandler(svc *learning.Service, auditRepo audit.Repository) *LearningHandler {
	return &LearningHandler{
		svc:       svc,
		auditRepo: auditRepo,
	}
}

func (h *LearningHandler) getIdentity(r *http.Request) (learning.FederatedIdentity, error) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || claims.Subject == "" {
		return learning.FederatedIdentity{}, errors.New("unauthorized: missing stable federated identity subject")
	}
	return learning.FederatedIdentity{
		Subject:  claims.Subject,
		Username: claims.PreferredUsername,
		Email:    claims.Email,
		Name:     claims.Name,
	}, nil
}

func (h *LearningHandler) writeError(w http.ResponseWriter, err error) {
	statusCode := http.StatusInternalServerError
	title := "Internal Server Error"
	detail := "An error occurred communicating with the learning system"

	switch {
	case errors.Is(err, learning.ErrLearningUserNotMapped):
		statusCode = http.StatusNotFound
		title = "Not Found"
		detail = "User not mapped in learning system"
	case errors.Is(err, learning.ErrMoodlePermission):
		statusCode = http.StatusForbidden
		title = "Forbidden"
		detail = "Permission denied in learning system"
	case errors.Is(err, learning.ErrCourseNotFound):
		statusCode = http.StatusNotFound
		title = "Not Found"
		detail = "Course not found"
	case errors.Is(err, learning.ErrMoodleAuthentication):
		statusCode = http.StatusBadGateway
		title = "Bad Gateway"
		detail = "Learning system authentication failed"
	case errors.Is(err, learning.ErrMoodleUnavailable) || errors.Is(err, learning.ErrMoodleTimeout):
		statusCode = http.StatusServiceUnavailable
		title = "Service Unavailable"
		detail = "Learning system is currently unavailable"
	case errors.Is(err, learning.ErrMoodleInvalidResponse):
		statusCode = http.StatusBadGateway
		title = "Bad Gateway"
		detail = "Learning system returned invalid response"
	}

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"type":   "about:blank",
		"title":  title,
		"status": statusCode,
		"detail": detail,
	})
}

func (h *LearningHandler) ListCourses(w http.ResponseWriter, r *http.Request) {
	courses, err := h.svc.ListCourses(r.Context(), learning.CourseFilter{})
	if err != nil {
		h.writeError(w, err)
		return
	}

	if courses == nil {
		courses = []learning.LearningCourse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": courses,
	})
}

func (h *LearningHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	identity, err := h.getIdentity(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unauthorized",
			"status": http.StatusUnauthorized,
			"detail": err.Error(),
		})
		return
	}
	user, err := h.svc.GetMe(r.Context(), identity)
	if err != nil {
		h.writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": user,
	})
}

func (h *LearningHandler) ListMyCourses(w http.ResponseWriter, r *http.Request) {
	identity, err := h.getIdentity(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unauthorized",
			"status": http.StatusUnauthorized,
			"detail": err.Error(),
		})
		return
	}
	courses, err := h.svc.ListMyCourses(r.Context(), identity)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if courses == nil {
		courses = []learning.EnrolledCourse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": courses,
	})
}

func (h *LearningHandler) GetMyCourseCompletion(w http.ResponseWriter, r *http.Request) {
	identity, err := h.getIdentity(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unauthorized",
			"status": http.StatusUnauthorized,
			"detail": err.Error(),
		})
		return
	}
	courseIDStr := r.PathValue("courseId")
	courseID, err := strconv.Atoi(courseIDStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Bad Request",
			"status": http.StatusBadRequest,
			"detail": "Invalid course ID",
		})
		return
	}

	completion, err := h.svc.GetMyCourseCompletion(r.Context(), identity, courseID)
	if err != nil {
		h.writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": completion,
	})
}

func (h *LearningHandler) GetMyCourseGrades(w http.ResponseWriter, r *http.Request) {
	identity, err := h.getIdentity(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unauthorized",
			"status": http.StatusUnauthorized,
			"detail": err.Error(),
		})
		return
	}
	courseIDStr := r.PathValue("courseId")
	courseID, err := strconv.Atoi(courseIDStr)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Bad Request",
			"status": http.StatusBadRequest,
			"detail": "Invalid course ID",
		})
		return
	}

	grades, err := h.svc.GetMyCourseGrades(r.Context(), identity, courseID)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if grades == nil {
		grades = []learning.GradeItem{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": grades,
	})
}

func (h *LearningHandler) ListMyCertificates(w http.ResponseWriter, r *http.Request) {
	identity, err := h.getIdentity(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unauthorized",
			"status": http.StatusUnauthorized,
			"detail": err.Error(),
		})
		return
	}

	certs, err := h.svc.ListMyCertificates(r.Context(), identity)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if certs == nil {
		certs = []learning.UserCertificate{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": certs,
	})
}

func (h *LearningHandler) VerifyCertificate(w http.ResponseWriter, r *http.Request) {
	code := strings.TrimSpace(r.URL.Query().Get("code"))
	correlationID := r.Header.Get("X-Correlation-ID")
	if correlationID == "" {
		correlationID = r.Header.Get("X-Request-ID")
	}
	var actorID string
	if claims, ok := middleware.ClaimsFromContext(r.Context()); ok && claims.Subject != "" {
		actorID = claims.Subject
	}

	if code == "" || len(code) > 64 {
		if h.auditRepo != nil {
			_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
				ID:          uuid.NewString(),
				ActorUserID: actorID,
				Action:      "CERTIFICATE_VERIFY_INVALID",
				Module:      "verification",
				TargetType:  "certificate",
				TargetID:    code,
				Result:      "INVALID_INPUT",
				TraceID:     correlationID,
				IPMasked:    audit.MaskIP(r.RemoteAddr),
				OccurredAt:  time.Now().UTC(),
			})
		}
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Bad Request",
			"status": http.StatusBadRequest,
			"detail": "Kode sertifikat wajib diisi dan maksimal 64 karakter",
		})
		return
	}

	result, err := h.svc.VerifyCertificate(r.Context(), code)
	if err != nil {
		if h.auditRepo != nil {
			_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
				ID:          uuid.NewString(),
				ActorUserID: actorID,
				Action:      "CERTIFICATE_VERIFY_ERROR",
				Module:      "verification",
				TargetType:  "certificate",
				TargetID:    code,
				Result:      "ERROR",
				TraceID:     correlationID,
				IPMasked:    audit.MaskIP(r.RemoteAddr),
				OccurredAt:  time.Now().UTC(),
			})
		}
		h.writeError(w, err)
		return
	}

	if !result.Valid || result.Certificate == nil {
		if h.auditRepo != nil {
			_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
				ID:          uuid.NewString(),
				ActorUserID: actorID,
				Action:      "CERTIFICATE_VERIFY_FAILED",
				Module:      "verification",
				TargetType:  "certificate",
				TargetID:    code,
				Result:      "NOT_FOUND",
				TraceID:     correlationID,
				IPMasked:    audit.MaskIP(r.RemoteAddr),
				OccurredAt:  time.Now().UTC(),
			})
		}
		msg := result.Message
		if msg == "" {
			msg = "Sertifikat dengan kode tersebut tidak ditemukan atau tidak valid."
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"valid":   false,
			"message": msg,
		})
		return
	}

	if h.auditRepo != nil {
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: actorID,
			Action:      "CERTIFICATE_VERIFIED",
			Module:      "verification",
			TargetType:  "certificate",
			TargetID:    code,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"valid":       true,
		"certificate": result.Certificate,
	})
}

func (h *LearningHandler) GetMyTranscript(w http.ResponseWriter, r *http.Request) {
	identity, err := h.getIdentity(r)
	if err != nil {
		w.Header().Set("Content-Type", "application/problem+json")
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
			"type":   "about:blank",
			"title":  "Unauthorized",
			"status": http.StatusUnauthorized,
			"detail": err.Error(),
		})
		return
	}

	transcript, err := h.svc.GetMyTranscript(r.Context(), identity)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if h.auditRepo != nil {
		correlationID := r.Header.Get("X-Correlation-ID")
		if correlationID == "" {
			correlationID = r.Header.Get("X-Request-ID")
		}
		_ = h.auditRepo.CreateEvent(r.Context(), &audit.AuditEvent{
			ID:          uuid.NewString(),
			ActorUserID: identity.Subject,
			Action:      "TRANSCRIPT_ACCESSED",
			Module:      "verification",
			TargetType:  "transcript",
			TargetID:    identity.Subject,
			Result:      "SUCCESS",
			TraceID:     correlationID,
			IPMasked:    audit.MaskIP(r.RemoteAddr),
			OccurredAt:  time.Now().UTC(),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": transcript,
	})
}

