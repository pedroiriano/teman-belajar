package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"teman-belajar-api/internal/domain/learning"
	"teman-belajar-api/internal/transport/http/middleware"
)

type LearningHandler struct {
	svc *learning.Service
}

func NewLearningHandler(svc *learning.Service) *LearningHandler {
	return &LearningHandler{
		svc: svc,
	}
}

func (h *LearningHandler) getIdentity(r *http.Request) (learning.FederatedIdentity, error) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || claims.Subject == "" {
		return learning.FederatedIdentity{}, errors.New("unauthorized: missing stable federated identity subject")
	}
	return learning.FederatedIdentity{
		Subject: claims.Subject,
		Email:   claims.Email,
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
