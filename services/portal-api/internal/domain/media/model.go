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
	ID               string
	StorageKey       string
	Bucket           string
	OriginalFilename *string
	DetectedMimeType string
	SizeBytes        int64
	ChecksumSHA256   string
	Title            *string
	AltText          *string
	Caption          *string
	Status           string
	CreatedAt        time.Time
	CreatedBy        *string
	UpdatedAt        time.Time
	UpdatedBy        *string
	ArchivedAt       *time.Time
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
	Title   *string
	AltText *string
	Caption *string
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
	ListAdminAssets(ctx context.Context, page, pageSize int) ([]MediaAsset, int, error)
	CheckIsPubliclyEligible(ctx context.Context, assetID string) (bool, error)
	HasActiveUsages(ctx context.Context, assetID string) (bool, error)
	AttachUsage(ctx context.Context, usage MediaUsage) error
	DetachUsage(ctx context.Context, mediaID, entityType, entityID, usageRole string) error
}
