package handler

import (
	"encoding/json"
	"errors"
	"io"
	"mime"
	"net/http"
	"strconv"
	"strings"

	"teman-belajar-api/internal/domain/media"
	"teman-belajar-api/internal/transport/http/middleware"
)

type MediaHandler struct {
	service *media.Service
}

func NewMediaHandler(service *media.Service) *MediaHandler {
	return &MediaHandler{service: service}
}

func (h *MediaHandler) requireEditor(w http.ResponseWriter, r *http.Request) (string, bool) {
	claims, ok := middleware.ClaimsFromContext(r.Context())
	if !ok || claims.Subject == "" {
		h.respondProblemCode(w, http.StatusUnauthorized, "Unauthorized", "Missing authenticated user", "AUTHENTICATION_REQUIRED")
		return "", false
	}
	if !hasAnyRole(claims.RealmAccess.Roles, "Portal Administrator", "Content Editor") {
		h.respondProblemCode(w, http.StatusForbidden, "Forbidden", "Content Editor role required", "MEDIA_WRITE_FORBIDDEN")
		return "", false
	}
	return claims.Subject, true
}

func (h *MediaHandler) GetMediaPolicy(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"data": media.Policy()})
}

func (h *MediaHandler) CreateMedia(w http.ResponseWriter, r *http.Request) {
	actorID, ok := h.requireEditor(w, r)
	if !ok {
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, media.MaxMultipartBytes)
	// #nosec G120 -- MaxBytesReader enforces the request-wide 32 MiB limit before multipart parsing.
	err := r.ParseMultipartForm(1 << 20)
	if err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			h.respondProblem(w, http.StatusRequestEntityTooLarge, "Payload Too Large", "Upload exceeds the 32 MiB limit")
			return
		}
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()
	update := media.MetadataUpdate{
		Title:   formValuePointer(r.FormValue("title")),
		AltText: formValuePointer(firstNonEmpty(r.FormValue("alt_text"), r.FormValue("altText"))),
		Caption: formValuePointer(r.FormValue("caption")),
	}
	if validateErr := media.ValidateMetadata(update); validateErr != nil {
		h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid metadata", validateErr.Error(), "MEDIA_METADATA_INVALID")
		return
	}

	asset, err := h.service.Upload(r.Context(), file, header.Filename, header.Size, actorID)
	if err != nil {
		if errors.Is(err, media.ErrInvalidMimeType) || errors.Is(err, media.ErrExtensionMimeMismatch) || errors.Is(err, media.ErrInvalidFilename) {
			h.respondProblemCode(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", err.Error(), "MEDIA_TYPE_REJECTED")
			return
		}
		if errors.Is(err, media.ErrImageCompressionRequired) {
			h.respondProblemCode(w, http.StatusRequestEntityTooLarge, "Image compression required", err.Error(), "IMAGE_COMPRESSION_REQUIRED")
			return
		}
		if errors.Is(err, media.ErrPayloadTooLarge) {
			h.respondProblemCode(w, http.StatusRequestEntityTooLarge, "Payload Too Large", err.Error(), "MEDIA_PAYLOAD_TOO_LARGE")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Update metadata immediately if provided
	if update.Title != nil || update.AltText != nil || update.Caption != nil {
		updated, updateErr := h.service.UpdateMetadata(r.Context(), asset.ID, update, actorID)
		if updateErr != nil {
			h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid metadata", updateErr.Error(), "MEDIA_METADATA_INVALID")
			return
		}
		asset = updated
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": asset}) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *MediaHandler) GetMediaContent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	content, err := h.service.GetPublicContent(r.Context(), id)
	if err != nil {
		// Do not expose why it is not found (private vs deleted vs not eligible)
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}
	defer content.Reader.Close()

	setMediaContentHeaders(w, content, true)
	w.Header().Set("Cache-Control", "public, max-age=300, must-revalidate")
	w.WriteHeader(http.StatusOK)

	io.Copy(w, content.Reader) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *MediaHandler) GetAdminMediaContent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	content, err := h.service.GetAdminContent(r.Context(), id)
	if err != nil {
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}
	defer content.Reader.Close()

	setMediaContentHeaders(w, content, false)
	w.Header().Set("Cache-Control", "private, no-store")
	w.WriteHeader(http.StatusOK)

	io.Copy(w, content.Reader) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *MediaHandler) ListAdminMedia(w http.ResponseWriter, r *http.Request) {
	pageStr := r.URL.Query().Get("page")
	page, _ := strconv.Atoi(pageStr)
	if page < 1 {
		page = 1
	}
	pageSizeStr := r.URL.Query().Get("page_size")
	pageSize, _ := strconv.Atoi(pageSizeStr)
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	filter := media.ListFilter{Page: page, PageSize: pageSize, Query: r.URL.Query().Get("q"), Kind: r.URL.Query().Get("kind")}
	assets, total, err := h.service.ListAdminAssets(r.Context(), filter)
	if err != nil {
		if errors.Is(err, media.ErrInvalidFilter) {
			h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid filter", err.Error(), "MEDIA_FILTER_INVALID")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"data": assets,
		"meta": map[string]interface{}{
			"page":      page,
			"page_size": pageSize,
			"total":     total,
		},
	})
}

func (h *MediaHandler) GetAdminMedia(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	asset, err := h.service.GetAdminAsset(r.Context(), id)
	if err != nil {
		if errors.Is(err, media.ErrAssetNotFound) {
			h.respondProblem(w, http.StatusNotFound, "Not Found", "Asset not found")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": asset}) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *MediaHandler) UpdateMediaMetadata(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	actorID, ok := h.requireEditor(w, r)
	if !ok {
		return
	}

	var update media.MetadataUpdate
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&update); err != nil {
		h.respondProblem(w, http.StatusBadRequest, "Invalid Request", "Failed to parse request body")
		return
	}
	if update.DisplayFilename == nil && update.Title == nil && update.AltText == nil && update.Caption == nil {
		h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid metadata", "At least one metadata field is required", "MEDIA_METADATA_INVALID")
		return
	}

	asset, err := h.service.UpdateMetadata(r.Context(), id, update, actorID)
	if err != nil {
		if errors.Is(err, media.ErrAssetNotFound) {
			h.respondProblem(w, http.StatusNotFound, "Not Found", "Asset not found")
			return
		}
		if errors.Is(err, media.ErrInvalidFilename) || errors.Is(err, media.ErrExtensionMimeMismatch) || errors.Is(err, media.ErrInvalidMetadata) {
			h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid metadata", err.Error(), "MEDIA_METADATA_INVALID")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": asset}) // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
}

func (h *MediaHandler) ArchiveMedia(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	actorID, ok := h.requireEditor(w, r)
	if !ok {
		return
	}

	err := h.service.ArchiveAsset(r.Context(), id, actorID)
	if err != nil {
		if errors.Is(err, media.ErrAssetNotFound) {
			h.respondProblem(w, http.StatusNotFound, "Not Found", "Asset not found")
			return
		}
		if errors.Is(err, media.ErrAssetInUse) {
			h.respondProblem(w, http.StatusConflict, "Asset in use", err.Error())
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MediaHandler) AttachMediaUsage(w http.ResponseWriter, r *http.Request) {
	mediaID := r.PathValue("id")
	actorID, ok := h.requireEditor(w, r)
	if !ok {
		return
	}

	var req struct {
		EntityType string `json:"entity_type"`
		EntityID   string `json:"entity_id"`
		UsageRole  string `json:"usage_role"`
		SortOrder  int    `json:"sort_order"`
	}
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		h.respondProblem(w, http.StatusBadRequest, "Invalid Request", "Failed to parse request body")
		return
	}

	err := h.service.AttachUsage(r.Context(), mediaID, req.EntityType, req.EntityID, req.UsageRole, req.SortOrder, actorID)
	if err != nil {
		if errors.Is(err, media.ErrAssetNotFound) {
			h.respondProblem(w, http.StatusNotFound, "Not Found", "Asset not found")
			return
		}
		if errors.Is(err, media.ErrInvalidUsage) {
			h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid usage", err.Error(), "MEDIA_USAGE_INVALID")
			return
		}
		if errors.Is(err, media.ErrUsageEntityNotFound) {
			h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid usage", err.Error(), "MEDIA_USAGE_ENTITY_NOT_FOUND")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MediaHandler) DetachMediaUsage(w http.ResponseWriter, r *http.Request) {
	mediaID := r.PathValue("id")
	actorID, ok := h.requireEditor(w, r)
	if !ok {
		return
	}

	entityType := r.URL.Query().Get("entity_type")
	entityID := r.URL.Query().Get("entity_id")
	usageRole := r.URL.Query().Get("usage_role")

	if entityType == "" || entityID == "" || usageRole == "" {
		h.respondProblem(w, http.StatusBadRequest, "Invalid Request", "Missing entity_type, entity_id, or usage_role")
		return
	}

	err := h.service.DetachUsage(r.Context(), mediaID, entityType, entityID, usageRole, actorID)
	if err != nil {
		if errors.Is(err, media.ErrInvalidUsage) {
			h.respondProblemCode(w, http.StatusUnprocessableEntity, "Invalid usage", err.Error(), "MEDIA_USAGE_INVALID")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MediaHandler) respondProblem(w http.ResponseWriter, status int, title, detail string) {
	h.respondProblemCode(w, status, title, detail, "")
}

func (h *MediaHandler) respondProblemCode(w http.ResponseWriter, status int, title, detail, code string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	payload := map[string]interface{}{ // #nosec G104 -- response writer error after commit is non-actionable in HTTP handler
		"type":     "about:blank",
		"status":   status,
		"title":    title,
		"detail":   detail,
		"trace_id": "",
	}
	if code != "" {
		payload["code"] = code
	}
	_ = json.NewEncoder(w).Encode(payload)
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}

func formValuePointer(value string) *string {
	if value == "" {
		return nil
	}
	return &value
}

func setMediaContentHeaders(w http.ResponseWriter, content *media.Content, public bool) {
	disposition := "inline"
	if content.MimeType == "application/pdf" {
		disposition = "attachment"
	}
	value := mime.FormatMediaType(disposition, map[string]string{"filename": content.DisplayFilename})
	if value == "" {
		value = disposition
	}
	w.Header().Set("Content-Type", content.MimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(content.SizeBytes, 10))
	w.Header().Set("Content-Disposition", value)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	if !public {
		w.Header().Set("Vary", "Authorization")
	}
	if strings.HasPrefix(content.MimeType, "image/") {
		w.Header().Set("Content-Security-Policy", "default-src 'none'; img-src 'self'")
	}
}
