package handler

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	application "teman-belajar-api/internal/application/notification"
	domain "teman-belajar-api/internal/domain/notification"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type NotificationService interface {
	List(context.Context, string, domain.ListFilter) (domain.Page, error)
	UnreadCount(context.Context, string, domain.Audience) (int, error)
	MarkRead(context.Context, string, domain.Audience, string) (*domain.Notification, error)
	MarkAllRead(context.Context, string, domain.Audience) (int, error)
	Preferences(context.Context, string, domain.Audience) ([]domain.Preference, error)
	SetPreference(context.Context, string, domain.Audience, domain.EventType, bool) (domain.Preference, error)
}

type actionWindow struct {
	started time.Time
	count   int
}
type notificationActionLimiter struct {
	mu       sync.Mutex
	windows  map[string]actionWindow
	limit    int
	duration time.Duration
	now      func() time.Time
}

func newNotificationActionLimiter(limit int, duration time.Duration) *notificationActionLimiter {
	return &notificationActionLimiter{windows: map[string]actionWindow{}, limit: limit, duration: duration, now: time.Now}
}
func (l *notificationActionLimiter) allow(subject string) (bool, int) {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	window := l.windows[subject]
	if window.started.IsZero() || now.Sub(window.started) >= l.duration {
		if len(l.windows) >= 10_000 {
			oldestKey := ""
			var oldest time.Time
			for key, candidate := range l.windows {
				if now.Sub(candidate.started) >= l.duration {
					delete(l.windows, key)
					continue
				}
				if oldestKey == "" || candidate.started.Before(oldest) {
					oldestKey, oldest = key, candidate.started
				}
			}
			if len(l.windows) >= 10_000 && oldestKey != "" {
				delete(l.windows, oldestKey)
			}
		}
		l.windows[subject] = actionWindow{started: now, count: 1}
		return true, 0
	}
	if window.count >= l.limit {
		retry := int(l.duration.Seconds() - now.Sub(window.started).Seconds())
		if retry < 1 {
			retry = 1
		}
		return false, retry
	}
	window.count++
	l.windows[subject] = window
	return true, 0
}

type NotificationHandler struct {
	service NotificationService
	limiter *notificationActionLimiter
}

func NewNotificationHandler(service NotificationService) *NotificationHandler {
	return &NotificationHandler{service: service, limiter: newNotificationActionLimiter(30, time.Minute)}
}

func notificationClaims(w http.ResponseWriter, r *http.Request) (middleware.CustomClaims, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || strings.TrimSpace(claims.Subject) == "" {
		notificationProblem(w, http.StatusUnauthorized, "NOTIFICATION_UNAUTHORIZED", "Tidak terautentikasi", "Identitas terverifikasi diperlukan")
		return middleware.CustomClaims{}, false
	}
	return claims, true
}

func authorizedNotificationAudience(w http.ResponseWriter, r *http.Request, claims middleware.CustomClaims) (domain.Audience, bool) {
	audience := domain.Audience(strings.TrimSpace(r.URL.Query().Get("audience")))
	if audience != domain.AudiencePortal && audience != domain.AudienceAdmin {
		notificationError(w, domain.ErrInvalidInput)
		return "", false
	}
	if audience == domain.AudienceAdmin && !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor", "Reviewer") {
		notificationProblem(w, http.StatusForbidden, "NOTIFICATION_AUDIENCE_FORBIDDEN", "Akses ditolak", "Anda tidak berhak mengakses notifikasi Admin")
		return "", false
	}
	return audience, true
}

func notificationProblem(w http.ResponseWriter, status int, code, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.Header().Set("Cache-Control", "no-store")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]any{"type": "https://teman-belajar.local/problems/" + strings.ToLower(code), "title": title, "status": status, "detail": detail, "code": code, "trace_id": uuid.NewString()})
}
func notificationError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, domain.ErrInvalidInput):
		notificationProblem(w, 422, "NOTIFICATION_VALIDATION_FAILED", "Permintaan tidak valid", "Permintaan notifikasi tidak valid")
	case errors.Is(err, domain.ErrNotFound):
		notificationProblem(w, 404, "NOTIFICATION_NOT_FOUND", "Notifikasi tidak ditemukan", "Notifikasi tidak ditemukan")
	default:
		notificationProblem(w, 503, "NOTIFICATION_UNAVAILABLE", "Layanan belum tersedia", "Pusat notifikasi untuk sementara belum tersedia")
	}
}
func rejectNotificationQuery(r *http.Request, allowed ...string) bool {
	set := map[string]struct{}{}
	for _, value := range allowed {
		set[value] = struct{}{}
	}
	for key := range r.URL.Query() {
		if _, ok := set[key]; !ok {
			return true
		}
	}
	return false
}
func (h *NotificationHandler) limitWrite(w http.ResponseWriter, subject string) bool {
	ok, retry := h.limiter.allow(subject)
	if ok {
		return true
	}
	w.Header().Set("Retry-After", strconv.Itoa(retry))
	notificationProblem(w, 429, "NOTIFICATION_RATE_LIMITED", "Terlalu banyak permintaan", "Tunggu sebelum mengubah notifikasi kembali")
	observability.RecordNotificationAction("rate_limited")
	return false
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	if rejectNotificationQuery(r, "audience", "page", "page_size", "status") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	claims, ok := notificationClaims(w, r)
	if !ok {
		return
	}
	audience, ok := authorizedNotificationAudience(w, r, claims)
	if !ok {
		return
	}
	page, pageSize := 1, application.DefaultPageSize
	var err error
	if value := r.URL.Query().Get("page"); value != "" {
		page, err = strconv.Atoi(value)
	}
	if err == nil {
		if value := r.URL.Query().Get("page_size"); value != "" {
			pageSize, err = strconv.Atoi(value)
		}
	}
	status := r.URL.Query().Get("status")
	if status == "" {
		status = "all"
	}
	if err != nil || (status != "all" && status != "unread") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	result, err := h.service.List(r.Context(), claims.Subject, domain.ListFilter{Audience: audience, Unread: status == "unread", Page: page, PageSize: pageSize})
	if err != nil {
		observability.RecordNotificationAction("list_error")
		notificationError(w, err)
		return
	}
	observability.RecordNotificationAction("list_success")
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, 200, result)
}
func (h *NotificationHandler) Summary(w http.ResponseWriter, r *http.Request) {
	if rejectNotificationQuery(r, "audience") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	claims, ok := notificationClaims(w, r)
	if !ok {
		return
	}
	audience, ok := authorizedNotificationAudience(w, r, claims)
	if !ok {
		return
	}
	count, err := h.service.UnreadCount(r.Context(), claims.Subject, audience)
	if err != nil {
		notificationError(w, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, 200, map[string]int{"unread_count": count})
}
func (h *NotificationHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	if rejectNotificationQuery(r, "audience") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	claims, ok := notificationClaims(w, r)
	if !ok {
		return
	}
	audience, ok := authorizedNotificationAudience(w, r, claims)
	if !ok || !h.limitWrite(w, claims.Subject) {
		return
	}
	item, err := h.service.MarkRead(r.Context(), claims.Subject, audience, r.PathValue("id"))
	if err != nil {
		notificationError(w, err)
		return
	}
	observability.RecordNotificationAction("read_success")
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, 200, item)
}
func (h *NotificationHandler) MarkAllRead(w http.ResponseWriter, r *http.Request) {
	if rejectNotificationQuery(r, "audience") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	claims, ok := notificationClaims(w, r)
	if !ok {
		return
	}
	audience, ok := authorizedNotificationAudience(w, r, claims)
	if !ok || !h.limitWrite(w, claims.Subject) {
		return
	}
	count, err := h.service.MarkAllRead(r.Context(), claims.Subject, audience)
	if err != nil {
		notificationError(w, err)
		return
	}
	observability.RecordNotificationAction("read_all_success")
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, 200, map[string]int{"updated": count})
}
func (h *NotificationHandler) Preferences(w http.ResponseWriter, r *http.Request) {
	if rejectNotificationQuery(r, "audience") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	claims, ok := notificationClaims(w, r)
	if !ok {
		return
	}
	audience, ok := authorizedNotificationAudience(w, r, claims)
	if !ok {
		return
	}
	items, err := h.service.Preferences(r.Context(), claims.Subject, audience)
	if err != nil {
		notificationError(w, err)
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, 200, map[string]any{"data": items})
}
func (h *NotificationHandler) SetPreference(w http.ResponseWriter, r *http.Request) {
	if rejectNotificationQuery(r, "audience") {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	claims, ok := notificationClaims(w, r)
	if !ok {
		return
	}
	audience, ok := authorizedNotificationAudience(w, r, claims)
	if !ok || !h.limitWrite(w, claims.Subject) {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	defer r.Body.Close()
	var input struct {
		Enabled *bool `json:"enabled"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(&input) != nil || input.Enabled == nil || decoder.Decode(&struct{}{}) != io.EOF {
		notificationError(w, domain.ErrInvalidInput)
		return
	}
	preference, err := h.service.SetPreference(r.Context(), claims.Subject, audience, domain.EventType(r.PathValue("eventType")), *input.Enabled)
	if err != nil {
		notificationError(w, err)
		return
	}
	observability.RecordNotificationAction("preference_success")
	w.Header().Set("Cache-Control", "no-store")
	respondJSON(w, 200, preference)
}
