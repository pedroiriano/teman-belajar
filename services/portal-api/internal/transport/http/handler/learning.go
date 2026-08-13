package handler

import (
	"encoding/json"
	"net/http"
	"strconv"

	"teman-belajar-api/internal/domain/learning"
)

type LearningHandler struct {
	svc *learning.Service
}

func NewLearningHandler(svc *learning.Service) *LearningHandler {
	return &LearningHandler{
		svc: svc,
	}
}

func (h *LearningHandler) getIdentity(r *http.Request) learning.FederatedIdentity {
	sub, _ := r.Context().Value("user_sub").(string)
	email, _ := r.Context().Value("user_email").(string)
	return learning.FederatedIdentity{
		Subject: sub,
		Email:   email,
	}
}

func (h *LearningHandler) writeError(w http.ResponseWriter, err error) {
	statusCode := http.StatusInternalServerError
	message := "Internal server error"

	switch {
	case err == learning.ErrLearningUserNotMapped:
		statusCode = http.StatusForbidden
		message = "User not mapped in learning system"
	case err == learning.ErrMoodlePermission:
		statusCode = http.StatusForbidden
		message = "Permission denied in learning system"
	case err == learning.ErrCourseNotFound:
		statusCode = http.StatusNotFound
		message = "Course not found"
	case err == learning.ErrMoodleAuthentication:
		statusCode = http.StatusBadGateway
		message = "Learning system authentication failed"
	case err == learning.ErrMoodleUnavailable || err == learning.ErrMoodleTimeout:
		statusCode = http.StatusServiceUnavailable
		message = "Learning system is currently unavailable"
	default:
		// Do not expose internal errors
		message = "An error occurred communicating with the learning system"
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": courses,
	})
}

func (h *LearningHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	identity := h.getIdentity(r)
	user, err := h.svc.GetMe(r.Context(), identity)
	if err != nil {
		h.writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": user,
	})
}

func (h *LearningHandler) ListMyCourses(w http.ResponseWriter, r *http.Request) {
	identity := h.getIdentity(r)
	courses, err := h.svc.ListMyCourses(r.Context(), identity)
	if err != nil {
		h.writeError(w, err)
		return
	}

	if courses == nil {
		courses = []learning.EnrolledCourse{}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": courses,
	})
}

func (h *LearningHandler) GetMyCourseCompletion(w http.ResponseWriter, r *http.Request) {
	identity := h.getIdentity(r)
	courseIDStr := r.PathValue("courseId")
	courseID, err := strconv.Atoi(courseIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid course ID"})
		return
	}

	completion, err := h.svc.GetMyCourseCompletion(r.Context(), identity, courseID)
	if err != nil {
		h.writeError(w, err)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": completion,
	})
}

func (h *LearningHandler) GetMyCourseGrades(w http.ResponseWriter, r *http.Request) {
	identity := h.getIdentity(r)
	courseIDStr := r.PathValue("courseId")
	courseID, err := strconv.Atoi(courseIDStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid course ID"})
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
	json.NewEncoder(w).Encode(map[string]interface{}{
		"data": grades,
	})
}
