package handler

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"

	"teman-belajar-api/internal/domain/media"
)

type MediaHandler struct {
	service *media.Service
}

func NewMediaHandler(service *media.Service) *MediaHandler {
	return &MediaHandler{service: service}
}

func (h *MediaHandler) CreateMedia(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(32 << 20) // 32 MB max memory
	if err != nil {
		http.Error(w, "Failed to parse multipart form", http.StatusBadRequest)
		return
	}

	file, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "File is required", http.StatusBadRequest)
		return
	}
	defer file.Close()

	actorID := r.Header.Get("X-User-ID")
	if actorID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	asset, err := h.service.Upload(r.Context(), file, header.Filename, header.Size, actorID)
	if err != nil {
		if errors.Is(err, media.ErrInvalidMimeType) {
			h.respondProblem(w, http.StatusUnsupportedMediaType, "Unsupported Media Type", err.Error())
			return
		}
		if errors.Is(err, media.ErrPayloadTooLarge) {
			h.respondProblem(w, http.StatusRequestEntityTooLarge, "Payload Too Large", err.Error())
			return
		}
		
		fmt.Printf("Upload Error: %v\n", err)
		
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	// Read optional metadata from form
	if title := r.FormValue("title"); title != "" {
		asset.Title = &title
	}
	if altText := r.FormValue("altText"); altText != "" {
		asset.AltText = &altText
	}
	if caption := r.FormValue("caption"); caption != "" {
		asset.Caption = &caption
	}

	// Update metadata immediately if provided
	if asset.Title != nil || asset.AltText != nil || asset.Caption != nil {
		asset, _ = h.service.UpdateMetadata(r.Context(), asset.ID, media.MetadataUpdate{
			Title:   asset.Title,
			AltText: asset.AltText,
			Caption: asset.Caption,
		}, actorID)
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{"data": asset})
}

func (h *MediaHandler) GetMediaContent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	
	reader, mimeType, size, err := h.service.GetPublicContent(r.Context(), id)
	if err != nil {
		// Do not expose why it is not found (private vs deleted vs not eligible)
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}
	defer reader.Close()

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	w.Header().Set("Cache-Control", "public, max-age=31536000") // 1 year cache
	w.Header().Set("Content-Disposition", "inline; filename=\""+id+"\"")
	w.WriteHeader(http.StatusOK)

	io.Copy(w, reader)
}

func (h *MediaHandler) GetAdminMediaContent(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	
	reader, mimeType, size, err := h.service.GetAdminContent(r.Context(), id)
	if err != nil {
		http.Error(w, "Not Found", http.StatusNotFound)
		return
	}
	defer reader.Close()

	w.Header().Set("Content-Type", mimeType)
	w.Header().Set("Content-Length", strconv.FormatInt(size, 10))
	w.Header().Set("Cache-Control", "private, max-age=3600")
	w.Header().Set("Content-Disposition", "inline; filename=\""+id+"\"")
	w.WriteHeader(http.StatusOK)

	io.Copy(w, reader)
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

	assets, total, err := h.service.ListAdminAssets(r.Context(), page, pageSize)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
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
	json.NewEncoder(w).Encode(map[string]interface{}{"data": asset})
}

func (h *MediaHandler) UpdateMediaMetadata(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	actorID := r.Header.Get("X-User-ID")

	var update media.MetadataUpdate
	if err := json.NewDecoder(r.Body).Decode(&update); err != nil {
		h.respondProblem(w, http.StatusBadRequest, "Invalid Request", "Failed to parse request body")
		return
	}

	asset, err := h.service.UpdateMetadata(r.Context(), id, update, actorID)
	if err != nil {
		if errors.Is(err, media.ErrAssetNotFound) {
			h.respondProblem(w, http.StatusNotFound, "Not Found", "Asset not found")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{"data": asset})
}

func (h *MediaHandler) ArchiveMedia(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	actorID := r.Header.Get("X-User-ID")

	err := h.service.ArchiveAsset(r.Context(), id, actorID)
	if err != nil {
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
	actorID := r.Header.Get("X-User-ID")

	var req struct {
		EntityType string `json:"entity_type"`
		EntityID   string `json:"entity_id"`
		UsageRole  string `json:"usage_role"`
		SortOrder  int    `json:"sort_order"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		h.respondProblem(w, http.StatusBadRequest, "Invalid Request", "Failed to parse request body")
		return
	}

	err := h.service.AttachUsage(r.Context(), mediaID, req.EntityType, req.EntityID, req.UsageRole, req.SortOrder, actorID)
	if err != nil {
		if errors.Is(err, media.ErrAssetNotFound) {
			h.respondProblem(w, http.StatusNotFound, "Not Found", "Asset not found")
			return
		}
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MediaHandler) DetachMediaUsage(w http.ResponseWriter, r *http.Request) {
	mediaID := r.PathValue("id")
	actorID := r.Header.Get("X-User-ID")

	entityType := r.URL.Query().Get("entity_type")
	entityID := r.URL.Query().Get("entity_id")
	usageRole := r.URL.Query().Get("usage_role")

	if entityType == "" || entityID == "" || usageRole == "" {
		h.respondProblem(w, http.StatusBadRequest, "Invalid Request", "Missing entity_type, entity_id, or usage_role")
		return
	}

	err := h.service.DetachUsage(r.Context(), mediaID, entityType, entityID, usageRole, actorID)
	if err != nil {
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func (h *MediaHandler) respondProblem(w http.ResponseWriter, status int, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": status,
		"title":  title,
		"detail": detail,
	})
}
