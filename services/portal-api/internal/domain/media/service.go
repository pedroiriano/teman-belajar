package media

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
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
	filename, err := NormalizeFilename(originalFilename)
	if err != nil {
		return nil, err
	}
	if declaredSize < 1 || declaredSize > s.maxUploadSize || declaredSize > MaxObjectBytes {
		return nil, ErrPayloadTooLarge
	}

	// Sniff MIME type using first 512 bytes
	header := make([]byte, 512)
	n, err := io.ReadFull(reader, header)
	if errors.Is(err, io.ErrUnexpectedEOF) || errors.Is(err, io.EOF) {
		err = nil
	}
	if err != nil && err != io.EOF {
		return nil, err
	}

	mimeType := DetectMIME(header[:n])
	if !IsAllowedMIME(mimeType) {
		return nil, ErrInvalidMimeType
	}
	if _, err := ValidateFilenameForMIME(filename, mimeType); err != nil {
		return nil, err
	}
	typeLimit := LimitForMIME(mimeType)
	if declaredSize > typeLimit {
		if typeLimit == MaxImageBytes {
			return nil, ErrImageCompressionRequired
		}
		return nil, ErrPayloadTooLarge
	}

	// Reconstruct reader
	multiReader := io.MultiReader(bytes.NewReader(header[:n]), reader)

	// Hash calculation during stream
	hash := sha256.New()
	teeReader := io.TeeReader(multiReader, hash)

	// Enforce limit reader to protect memory
	limitReader := io.LimitReader(teeReader, typeLimit+1)

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

	if actualSize > typeLimit {
		// Exceeded limit (limitReader reached EOF)
		_ = s.storage.Delete(ctx, s.bucket, objectKey)
		if typeLimit == MaxImageBytes {
			return nil, ErrImageCompressionRequired
		}
		return nil, ErrPayloadTooLarge
	}

	checksum := hex.EncodeToString(hash.Sum(nil))

	asset := &MediaAsset{
		ID:               assetID,
		StorageKey:       objectKey,
		Bucket:           s.bucket,
		OriginalFilename: &filename,
		DisplayFilename:  &filename,
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

func (s *Service) UpdateMetadata(ctx context.Context, id string, update MetadataUpdate, actorID string) (*MediaAsset, error) {
	if err := ValidateMetadata(update); err != nil {
		return nil, err
	}
	before, err := s.repo.GetAssetByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if update.DisplayFilename != nil {
		value, validateErr := ValidateFilenameForMIME(*update.DisplayFilename, before.DetectedMimeType)
		if validateErr != nil {
			return nil, validateErr
		}
		update.DisplayFilename = &value
	}
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
	if update.DisplayFilename != nil && (before.DisplayFilename == nil || *before.DisplayFilename != *update.DisplayFilename) {
		_ = s.auditRepo.CreateEvent(ctx, &audit.AuditEvent{ID: uuid.New().String(), ActorUserID: actorID, Action: "MEDIA_RENAMED", TargetType: "media", TargetID: id, Result: "success", OccurredAt: time.Now()})
	}

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

func (s *Service) GetPublicContent(ctx context.Context, id string) (*Content, error) {
	asset, err := s.repo.GetAssetByID(ctx, id)
	if err != nil {
		return nil, ErrAssetNotFound
	}
	if asset.Status != StatusActive {
		return nil, ErrAssetNotFound
	}

	eligible, err := s.repo.CheckIsPubliclyEligible(ctx, id)
	if err != nil {
		return nil, err
	}
	if !eligible {
		return nil, ErrAssetNotFound
	}

	reader, err := s.storage.Get(ctx, asset.Bucket, asset.StorageKey)
	if err != nil {
		return nil, err
	}
	return &Content{Reader: reader, MimeType: asset.DetectedMimeType, SizeBytes: asset.SizeBytes, DisplayFilename: displayFilename(asset)}, nil
}

func (s *Service) GetAdminContent(ctx context.Context, id string) (*Content, error) {
	asset, err := s.repo.GetAssetByID(ctx, id)
	if err != nil {
		return nil, ErrAssetNotFound
	}

	reader, err := s.storage.Get(ctx, asset.Bucket, asset.StorageKey)
	if err != nil {
		return nil, err
	}
	return &Content{Reader: reader, MimeType: asset.DetectedMimeType, SizeBytes: asset.SizeBytes, DisplayFilename: displayFilename(asset)}, nil
}

func displayFilename(asset *MediaAsset) string {
	if asset.DisplayFilename != nil {
		return *asset.DisplayFilename
	}
	if asset.OriginalFilename != nil {
		return *asset.OriginalFilename
	}
	return asset.ID
}

func (s *Service) ListAdminAssets(ctx context.Context, filter ListFilter) ([]MediaAsset, int, error) {
	filter, err := NormalizeListFilter(filter)
	if err != nil {
		return nil, 0, err
	}
	return s.repo.ListAdminAssets(ctx, filter)
}

func (s *Service) GetAdminAsset(ctx context.Context, id string) (*MediaAsset, error) {
	return s.repo.GetAssetByID(ctx, id)
}

func (s *Service) AttachUsage(ctx context.Context, mediaID, entityType, entityID, usageRole string, sortOrder int, actorID string) error {
	if _, err := uuid.Parse(mediaID); err != nil {
		return ErrInvalidUsage
	}
	if _, err := uuid.Parse(entityID); err != nil {
		return ErrInvalidUsage
	}
	if err := ValidateUsage(entityType, entityID, usageRole, sortOrder); err != nil {
		return err
	}
	asset, err := s.repo.GetAssetByID(ctx, mediaID)
	if err != nil {
		return ErrAssetNotFound
	}
	if asset.Status != StatusActive {
		return errors.New("cannot attach non-active asset")
	}
	exists, err := s.repo.UsageEntityExists(ctx, entityType, entityID)
	if err != nil {
		return err
	}
	if !exists {
		return ErrUsageEntityNotFound
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
	if _, err := uuid.Parse(mediaID); err != nil {
		return ErrInvalidUsage
	}
	if _, err := uuid.Parse(entityID); err != nil {
		return ErrInvalidUsage
	}
	if err := ValidateUsage(entityType, entityID, usageRole, 0); err != nil {
		return err
	}
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
