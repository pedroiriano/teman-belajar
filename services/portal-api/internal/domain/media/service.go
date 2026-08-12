package media

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"teman-belajar-api/internal/domain/audit"

	"github.com/google/uuid"
)

var (
	ErrInvalidMimeType = errors.New("unsupported media type")
	ErrPayloadTooLarge = errors.New("payload too large")
	ErrAssetNotFound   = errors.New("asset not found")
	ErrAssetInUse      = errors.New("asset still in use")
)

type Service struct {
	repo          Repository
	storage       StoragePort
	auditRepo     audit.Repository
	bucket        string
	maxUploadSize int64
}

func NewService(repo Repository, storage StoragePort, auditRepo audit.Repository, bucket string, maxUploadSize int64) *Service {
	return &Service{
		repo:          repo,
		storage:       storage,
		auditRepo:     auditRepo,
		bucket:        bucket,
		maxUploadSize: maxUploadSize,
	}
}

// Upload handles securely storing a binary asset in MinIO and saving its metadata to PostgreSQL.
func (s *Service) Upload(ctx context.Context, reader io.Reader, originalFilename string, declaredSize int64, actorID string) (*MediaAsset, error) {
	if declaredSize > s.maxUploadSize {
		return nil, ErrPayloadTooLarge
	}

	// Sniff MIME type using first 512 bytes
	header := make([]byte, 512)
	n, err := reader.Read(header)
	if err != nil && err != io.EOF {
		return nil, err
	}

	mimeType := s.sniffMimeType(header[:n])
	if !s.isMimeTypeAllowed(mimeType) {
		return nil, ErrInvalidMimeType
	}

	// Reconstruct reader
	multiReader := io.MultiReader(strings.NewReader(string(header[:n])), reader)

	// Hash calculation during stream
	hash := sha256.New()
	teeReader := io.TeeReader(multiReader, hash)
	
	// Enforce limit reader to protect memory
	limitReader := io.LimitReader(teeReader, s.maxUploadSize+1)

	assetID := uuid.New().String()
	now := time.Now()
	objectKey := fmt.Sprintf("media/%d/%02d/%s", now.Year(), now.Month(), assetID)

	// Stream to MinIO
	err = s.storage.Put(ctx, s.bucket, objectKey, limitReader, -1, mimeType)
	if err != nil {
		return nil, fmt.Errorf("failed to put object to storage: %w", err)
	}

	actualSize, err := s.storage.Stat(ctx, s.bucket, objectKey)
	if err != nil {
		// Attempt cleanup
		_ = s.storage.Delete(ctx, s.bucket, objectKey)
		return nil, fmt.Errorf("failed to stat object: %w", err)
	}

	if actualSize > s.maxUploadSize {
		// Exceeded limit (limitReader reached EOF)
		_ = s.storage.Delete(ctx, s.bucket, objectKey)
		return nil, ErrPayloadTooLarge
	}

	checksum := hex.EncodeToString(hash.Sum(nil))

	asset := &MediaAsset{
		ID:               assetID,
		StorageKey:       objectKey,
		Bucket:           s.bucket,
		OriginalFilename: &originalFilename,
		DetectedMimeType: mimeType,
		SizeBytes:        actualSize,
		ChecksumSHA256:   checksum,
		Status:           StatusActive,
		CreatedAt:        now,
		CreatedBy:        &actorID,
		UpdatedAt:        now,
		UpdatedBy:        &actorID,
	}

	err = s.repo.CreateAsset(ctx, asset)
	if err != nil {
		// Deterministic compensation
		_ = s.storage.Delete(context.Background(), s.bucket, objectKey)
		return nil, fmt.Errorf("failed to save metadata: %w", err)
	}

	// Audit
	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
		ID:          uuid.New().String(),
		ActorUserID: actorID,
		Action:      "MEDIA_UPLOADED",
		TargetType:  "media",
		TargetID:    assetID,
		Result:      "success",
		OccurredAt:  time.Now(),
	})

	return asset, nil
}

func (s *Service) sniffMimeType(data []byte) string {
	// Simple magic byte checking for allowed types
	if len(data) >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF {
		return "image/jpeg"
	}
	if len(data) >= 8 && data[0] == 0x89 && data[1] == 0x50 && data[2] == 0x4E && data[3] == 0x47 &&
		data[4] == 0x0D && data[5] == 0x0A && data[6] == 0x1A && data[7] == 0x0A {
		return "image/png"
	}
	if len(data) >= 12 && string(data[0:4]) == "RIFF" && string(data[8:12]) == "WEBP" {
		return "image/webp"
	}
	if len(data) >= 4 && data[0] == 0x25 && data[1] == 0x50 && data[2] == 0x44 && data[3] == 0x46 {
		return "application/pdf"
	}
	return "application/octet-stream"
}

func (s *Service) isMimeTypeAllowed(mime string) bool {
	allowed := map[string]bool{
		"image/jpeg":      true,
		"image/png":       true,
		"image/webp":      true,
		"application/pdf": true,
	}
	return allowed[mime]
}

func (s *Service) UpdateMetadata(ctx context.Context, id string, update MetadataUpdate, actorID string) (*MediaAsset, error) {
	asset, err := s.repo.UpdateMetadata(ctx, id, update, actorID)
	if err != nil {
		return nil, err
	}

	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
		ID:          uuid.New().String(),
		ActorUserID: actorID,
		Action:      "MEDIA_METADATA_UPDATED",
		TargetType:  "media",
		TargetID:    id,
		Result:      "success",
		OccurredAt:  time.Now(),
	})

	return asset, nil
}

func (s *Service) ArchiveAsset(ctx context.Context, id string, actorID string) error {
	inUse, err := s.repo.HasActiveUsages(ctx, id)
	if err != nil {
		return err
	}
	if inUse {
		return ErrAssetInUse
	}

	err = s.repo.ArchiveAsset(ctx, id, actorID)
	if err != nil {
		return err
	}

	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
		ID:          uuid.New().String(),
		ActorUserID: actorID,
		Action:      "MEDIA_ARCHIVED",
		TargetType:  "media",
		TargetID:    id,
		Result:      "success",
		OccurredAt:  time.Now(),
	})

	return nil
}

func (s *Service) GetPublicContent(ctx context.Context, id string) (io.ReadCloser, string, int64, error) {
	asset, err := s.repo.GetAssetByID(ctx, id)
	if err != nil {
		return nil, "", 0, ErrAssetNotFound
	}
	if asset.Status != StatusActive {
		return nil, "", 0, ErrAssetNotFound
	}

	eligible, err := s.repo.CheckIsPubliclyEligible(ctx, id)
	if err != nil {
		return nil, "", 0, err
	}
	if !eligible {
		return nil, "", 0, ErrAssetNotFound
	}

	reader, err := s.storage.Get(ctx, asset.Bucket, asset.StorageKey)
	if err != nil {
		return nil, "", 0, err
	}

	return reader, asset.DetectedMimeType, asset.SizeBytes, nil
}

func (s *Service) GetAdminContent(ctx context.Context, id string) (io.ReadCloser, string, int64, error) {
	asset, err := s.repo.GetAssetByID(ctx, id)
	if err != nil {
		return nil, "", 0, ErrAssetNotFound
	}
	
	reader, err := s.storage.Get(ctx, asset.Bucket, asset.StorageKey)
	if err != nil {
		return nil, "", 0, err
	}

	return reader, asset.DetectedMimeType, asset.SizeBytes, nil
}

func (s *Service) ListAdminAssets(ctx context.Context, page, pageSize int) ([]MediaAsset, int, error) {
	return s.repo.ListAdminAssets(ctx, page, pageSize)
}

func (s *Service) GetAdminAsset(ctx context.Context, id string) (*MediaAsset, error) {
	return s.repo.GetAssetByID(ctx, id)
}

func (s *Service) AttachUsage(ctx context.Context, mediaID, entityType, entityID, usageRole string, sortOrder int, actorID string) error {
	asset, err := s.repo.GetAssetByID(ctx, mediaID)
	if err != nil {
		return ErrAssetNotFound
	}
	if asset.Status != StatusActive {
		return errors.New("cannot attach non-active asset")
	}

	usage := MediaUsage{
		ID:         uuid.New().String(),
		MediaID:    mediaID,
		EntityType: entityType,
		EntityID:   entityID,
		UsageRole:  usageRole,
		SortOrder:  sortOrder,
		CreatedAt:  time.Now(),
		CreatedBy:  &actorID,
	}

	if err := s.repo.AttachUsage(ctx, usage); err != nil {
		return err
	}

	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
		ID:          uuid.New().String(),
		ActorUserID: actorID,
		Action:      "MEDIA_ATTACHED",
		TargetType:  "media",
		TargetID:    mediaID,
		Result:      "success",
		OccurredAt:  time.Now(),
	})

	return nil
}

func (s *Service) DetachUsage(ctx context.Context, mediaID, entityType, entityID, usageRole string, actorID string) error {
	if err := s.repo.DetachUsage(ctx, mediaID, entityType, entityID, usageRole); err != nil {
		return err
	}

	_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{
		ID:          uuid.New().String(),
		ActorUserID: actorID,
		Action:      "MEDIA_DETACHED",
		TargetType:  "media",
		TargetID:    mediaID,
		Result:      "success",
		OccurredAt:  time.Now(),
	})

	return nil
}
