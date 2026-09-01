package handler

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/audit"
	domain "teman-belajar-api/internal/domain/mediagallery"
	"teman-belajar-api/internal/observability"
	"teman-belajar-api/internal/transport/http/middleware"
)

type MediaGalleryHandler struct {
	service *domain.Service
	audit   audit.Repository
}

func NewMediaGalleryHandler(service *domain.Service, auditRepository audit.Repository) *MediaGalleryHandler {
	return &MediaGalleryHandler{service: service, audit: auditRepository}
}

func (handler *MediaGalleryHandler) PublicList(response http.ResponseWriter, request *http.Request) {
	page, err := handler.service.ListPublic(request.Context(), galleryFilter(request, false))
	if err != nil {
		handler.failure(response, request, "", "MEDIA_GALLERY_PUBLIC_LISTED", err)
		return
	}
	response.Header().Set("Cache-Control", "public, max-age=30, stale-if-error=300")
	observability.RecordMediaGallery("public_list", "success")
	respondJSON(response, http.StatusOK, page)
}
func (handler *MediaGalleryHandler) PublicDetail(response http.ResponseWriter, request *http.Request) {
	collection, err := handler.service.GetPublic(request.Context(), request.PathValue("slug"))
	if err != nil {
		handler.failure(response, request, "", "MEDIA_GALLERY_PUBLIC_VIEWED", err)
		return
	}
	response.Header().Set("Cache-Control", "public, max-age=30, stale-if-error=300")
	observability.RecordMediaGallery("public_detail", "success")
	respondJSON(response, http.StatusOK, map[string]any{"data": collection})
}
func (handler *MediaGalleryHandler) AdminList(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "read")
	if !ok {
		return
	}
	page, err := handler.service.ListAdmin(request.Context(), galleryFilter(request, true), claims.RealmAccess.Roles)
	if err != nil {
		handler.failure(response, request, claims.Subject, "MEDIA_GALLERY_ADMIN_LISTED", err)
		return
	}
	handler.record(request, claims.Subject, "MEDIA_GALLERY_ADMIN_LISTED", "collections", "SUCCESS")
	response.Header().Set("Cache-Control", "private, no-store")
	respondJSON(response, http.StatusOK, page)
}
func (handler *MediaGalleryHandler) AdminGet(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "read")
	if !ok {
		return
	}
	collection, err := handler.service.GetAdmin(request.Context(), request.PathValue("id"), claims.RealmAccess.Roles)
	if err != nil {
		handler.failure(response, request, claims.Subject, "MEDIA_GALLERY_ADMIN_VIEWED", err)
		return
	}
	handler.record(request, claims.Subject, "MEDIA_GALLERY_ADMIN_VIEWED", collection.ID, "SUCCESS")
	response.Header().Set("Cache-Control", "private, no-store")
	respondJSON(response, http.StatusOK, map[string]any{"data": collection})
}
func (handler *MediaGalleryHandler) Create(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "write")
	if !ok {
		return
	}
	var input domain.Input
	if !decodeGalleryRequest(response, request, &input) {
		handler.record(request, claims.Subject, "MEDIA_COLLECTION_CREATED", "collection", "REJECTED")
		return
	}
	collection, err := handler.service.Create(request.Context(), input, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		handler.failure(response, request, claims.Subject, "MEDIA_COLLECTION_CREATED", err)
		return
	}
	observability.RecordMediaGallery("create", "success")
	respondJSON(response, http.StatusCreated, map[string]any{"data": collection})
}

type galleryUpdateRequest struct {
	ExpectedVersion int64        `json:"expected_version"`
	Collection      domain.Input `json:"collection"`
}

func (handler *MediaGalleryHandler) Update(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "write")
	if !ok {
		return
	}
	var input galleryUpdateRequest
	if !decodeGalleryRequest(response, request, &input) {
		handler.record(request, claims.Subject, "MEDIA_COLLECTION_UPDATED", request.PathValue("id"), "REJECTED")
		return
	}
	collection, err := handler.service.Update(request.Context(), request.PathValue("id"), input.ExpectedVersion, input.Collection, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		handler.failure(response, request, claims.Subject, "MEDIA_COLLECTION_UPDATED", err)
		return
	}
	observability.RecordMediaGallery("update", "success")
	respondJSON(response, http.StatusOK, map[string]any{"data": collection})
}

type galleryTransitionRequest struct {
	ExpectedVersion int64  `json:"expected_version"`
	Status          string `json:"status"`
}

func (handler *MediaGalleryHandler) Transition(response http.ResponseWriter, request *http.Request) {
	claims, ok := handler.authorize(response, request, "transition")
	if !ok {
		return
	}
	var input galleryTransitionRequest
	if !decodeGalleryRequest(response, request, &input) {
		handler.record(request, claims.Subject, "MEDIA_COLLECTION_TRANSITIONED", request.PathValue("id"), "REJECTED")
		return
	}
	collection, err := handler.service.Transition(request.Context(), request.PathValue("id"), input.ExpectedVersion, input.Status, claims.RealmAccess.Roles, claims.Subject)
	if err != nil {
		handler.failure(response, request, claims.Subject, "MEDIA_COLLECTION_TRANSITIONED", err)
		return
	}
	observability.RecordMediaGallery("transition", "success")
	respondJSON(response, http.StatusOK, map[string]any{"data": collection})
}

func galleryFilter(request *http.Request, admin bool) domain.Filter {
	page, _ := strconv.Atoi(request.URL.Query().Get("page"))
	size, _ := strconv.Atoi(request.URL.Query().Get("page_size"))
	filter := domain.Filter{Page: page, PageSize: size, Query: request.URL.Query().Get("q"), Kind: request.URL.Query().Get("kind")}
	if admin {
		filter.Status = request.URL.Query().Get("status")
		if filter.Status == "all" {
			filter.Status = ""
		}
	}
	return filter
}

func (handler *MediaGalleryHandler) authorize(response http.ResponseWriter, request *http.Request, operation string) (middleware.CustomClaims, bool) {
	claims, exists := middleware.ClaimsFromContext(request.Context())
	allowed := exists && galleryHasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor", "Reviewer")
	if !allowed {
		handler.record(request, claims.Subject, "MEDIA_GALLERY_ACCESS_"+operation, "collection", "DENIED")
		observability.RecordMediaGallery("authorization", "denied")
		respondProblem(response, http.StatusForbidden, "Forbidden", "Media Gallery access is not permitted")
		return claims, false
	}
	return claims, true
}
func galleryHasAnyRole(roles []string, allowed ...string) bool {
	for _, role := range roles {
		for _, candidate := range allowed {
			if role == candidate {
				return true
			}
		}
	}
	return false
}

func (handler *MediaGalleryHandler) failure(response http.ResponseWriter, request *http.Request, actor, action string, err error) {
	status, title, detail, result := http.StatusServiceUnavailable, "Service Unavailable", "Media Gallery is temporarily unavailable", "FAILED"
	switch {
	case errors.Is(err, domain.ErrNotFound):
		status, title, detail, result = http.StatusNotFound, "Not Found", "Media collection was not found", "NOT_FOUND"
	case errors.Is(err, domain.ErrForbidden):
		status, title, detail, result = http.StatusForbidden, "Forbidden", "Media collection operation is not permitted", "DENIED"
	case errors.Is(err, domain.ErrVersionConflict):
		status, title, detail, result = http.StatusConflict, "Version Conflict", "Media collection changed; reload before saving", "CONFLICT"
	case errors.Is(err, domain.ErrInvalidInput), errors.Is(err, domain.ErrInvalidMedia), errors.Is(err, domain.ErrInvalidTransition):
		status, title, detail, result = http.StatusUnprocessableEntity, "Validation Error", "Media collection contains an unsupported value, asset, order, or transition", "REJECTED"
	}
	handler.record(request, actor, action, request.PathValue("id"), result)
	observability.RecordMediaGallery("request", result)
	respondProblem(response, status, title, detail)
}
func decodeGalleryRequest(response http.ResponseWriter, request *http.Request, destination any) bool {
	request.Body = http.MaxBytesReader(response, request.Body, domain.MaxPayloadBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if decoder.Decode(destination) != nil {
		respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Invalid media collection request")
		return false
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		respondProblem(response, http.StatusUnprocessableEntity, "Validation Error", "Invalid media collection request")
		return false
	}
	return true
}
func (handler *MediaGalleryHandler) record(request *http.Request, actor, action, target, result string) {
	if handler.audit == nil {
		return
	}
	correlation := request.Header.Get("X-Request-ID")
	if !correlationIDPattern.MatchString(correlation) {
		correlation = uuid.NewString()
	}
	_ = handler.audit.CreateEvent(request.Context(), &audit.AuditEvent{ID: uuid.NewString(), ActorUserID: actor, Action: action, Module: "media_gallery", TargetType: "media_collection", TargetID: target, Result: result, TraceID: correlation, IPMasked: audit.MaskIP(request.RemoteAddr), OccurredAt: time.Now().UTC()})
}
