package media

import (
	"context"
	"io"
	"time"
)

// Status constants
const (
	StatusActive   = "active"
	StatusArchived = "archived"
)

// MediaAsset represents a binary asset tracked in the system.
type MediaAsset struct {
	ID               string     `json:"id"`
	StorageKey       string     `json:"-"`
	Bucket           string     `json:"-"`
	OriginalFilename *string    `json:"original_filename"`
	DisplayFilename  *string    `json:"display_filename"`
	DetectedMimeType string     `json:"detected_mime_type"`
	SizeBytes        int64      `json:"size_bytes"`
	ChecksumSHA256   string     `json:"-"`
	Title            *string    `json:"title"`
	AltText          *string    `json:"alt_text"`
	Caption          *string    `json:"caption"`
	Status           string     `json:"status"`
	CreatedAt        time.Time  `json:"created_at"`
	CreatedBy        *string    `json:"-"`
	UpdatedAt        time.Time  `json:"updated_at"`
	UpdatedBy        *string    `json:"-"`
	ArchivedAt       *time.Time `json:"archived_at"`
}

// MediaUsage represents the relationship between a media asset and a domain entity.
type MediaUsage struct {
	ID         string
	MediaID    string
	EntityType string
	EntityID   string
	UsageRole  string
	SortOrder  int
	CreatedAt  time.Time
	CreatedBy  *string
}

// MetadataUpdate holds fields that can be updated.
type MetadataUpdate struct {
	DisplayFilename *string `json:"display_filename"`
	Title           *string `json:"title"`
	AltText         *string `json:"alt_text"`
	Caption         *string `json:"caption"`
}

type ListFilter struct {
	Page     int
	PageSize int
	Query    string
	Kind     string
}

type Content struct {
	Reader          io.ReadCloser
	MimeType        string
	SizeBytes       int64
	DisplayFilename string
}

// StoragePort defines the interface for the object storage adapter (e.g. MinIO).
type StoragePort interface {
	Put(ctx context.Context, bucket, objectKey string, reader io.Reader, objectSize int64, mimeType string) error
	Get(ctx context.Context, bucket, objectKey string) (io.ReadCloser, error)
	Stat(ctx context.Context, bucket, objectKey string) (int64, error)
	Delete(ctx context.Context, bucket, objectKey string) error
}

// Repository defines the interface for the Postgres metadata adapter.
type Repository interface {
	CreateAsset(ctx context.Context, asset *MediaAsset) error
	GetAssetByID(ctx context.Context, id string) (*MediaAsset, error)
	UpdateMetadata(ctx context.Context, id string, update MetadataUpdate, updatedBy string) (*MediaAsset, error)
	ArchiveAsset(ctx context.Context, id string, archivedBy string) error
	ListAdminAssets(ctx context.Context, filter ListFilter) ([]MediaAsset, int, error)
	CheckIsPubliclyEligible(ctx context.Context, assetID string) (bool, error)
	HasActiveUsages(ctx context.Context, assetID string) (bool, error)
	UsageEntityExists(ctx context.Context, entityType, entityID string) (bool, error)
	AttachUsage(ctx context.Context, usage MediaUsage) error
	DetachUsage(ctx context.Context, mediaID, entityType, entityID, usageRole string) error
}
