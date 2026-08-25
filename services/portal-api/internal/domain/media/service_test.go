package media

import (
	"bytes"
	"context"
	"errors"
	"io"
	"testing"

	"teman-belajar-api/internal/domain/audit"
)

type fakeRepo struct {
	assets       map[string]*MediaAsset
	usages       map[string]MediaUsage
	failCreate   bool
	entityExists bool
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{assets: map[string]*MediaAsset{}, usages: map[string]MediaUsage{}, entityExists: true}
}
func (f *fakeRepo) CreateAsset(_ context.Context, asset *MediaAsset) error {
	if f.failCreate {
		return errors.New("db failed")
	}
	copy := *asset
	f.assets[asset.ID] = &copy
	return nil
}
func (f *fakeRepo) GetAssetByID(_ context.Context, id string) (*MediaAsset, error) {
	asset, ok := f.assets[id]
	if !ok {
		return nil, ErrAssetNotFound
	}
	copy := *asset
	return &copy, nil
}
func (f *fakeRepo) UpdateMetadata(_ context.Context, id string, update MetadataUpdate, _ string) (*MediaAsset, error) {
	asset, ok := f.assets[id]
	if !ok {
		return nil, ErrAssetNotFound
	}
	if update.DisplayFilename != nil {
		asset.DisplayFilename = update.DisplayFilename
	}
	if update.Title != nil {
		asset.Title = update.Title
	}
	if update.AltText != nil {
		asset.AltText = update.AltText
	}
	if update.Caption != nil {
		asset.Caption = update.Caption
	}
	copy := *asset
	return &copy, nil
}
func (f *fakeRepo) ArchiveAsset(_ context.Context, id, _ string) error {
	f.assets[id].Status = StatusArchived
	return nil
}
func (f *fakeRepo) ListAdminAssets(_ context.Context, _ ListFilter) ([]MediaAsset, int, error) {
	return nil, len(f.assets), nil
}
func (f *fakeRepo) CheckIsPubliclyEligible(_ context.Context, _ string) (bool, error) {
	return true, nil
}
func (f *fakeRepo) HasActiveUsages(_ context.Context, id string) (bool, error) {
	for _, usage := range f.usages {
		if usage.MediaID == id {
			return true, nil
		}
	}
	return false, nil
}
func (f *fakeRepo) UsageEntityExists(context.Context, string, string) (bool, error) {
	return f.entityExists, nil
}
func (f *fakeRepo) AttachUsage(_ context.Context, usage MediaUsage) error {
	f.usages[usage.MediaID+usage.EntityID+usage.UsageRole] = usage
	return nil
}
func (f *fakeRepo) DetachUsage(_ context.Context, mediaID, _, entityID, usageRole string) error {
	delete(f.usages, mediaID+entityID+usageRole)
	return nil
}

type fakeStorage struct {
	objects       map[string][]byte
	puts, deletes int
}

func newFakeStorage() *fakeStorage { return &fakeStorage{objects: map[string][]byte{}} }
func (f *fakeStorage) Put(_ context.Context, bucket, key string, reader io.Reader, _ int64, _ string) error {
	data, err := io.ReadAll(reader)
	if err == nil {
		f.objects[bucket+key] = data
		f.puts++
	}
	return err
}
func (f *fakeStorage) Get(_ context.Context, bucket, key string) (io.ReadCloser, error) {
	return io.NopCloser(bytes.NewReader(f.objects[bucket+key])), nil
}
func (f *fakeStorage) Stat(_ context.Context, bucket, key string) (int64, error) {
	return int64(len(f.objects[bucket+key])), nil
}
func (f *fakeStorage) Delete(_ context.Context, bucket, key string) error {
	delete(f.objects, bucket+key)
	f.deletes++
	return nil
}

type fakeAudit struct{}

func (fakeAudit) CreateEvent(context.Context, *audit.AuditEvent) error { return nil }

func jpeg(size int) []byte {
	data := make([]byte, size)
	copy(data, []byte{0xff, 0xd8, 0xff, 0xe0})
	return data
}
func pdf(size int) []byte { data := make([]byte, size); copy(data, []byte("%PDF-1.7\n")); return data }

func TestUploadPolicyValidation(t *testing.T) {
	tests := []struct {
		name, filename string
		data           []byte
		declared       int64
		want           error
	}{
		{"valid jpeg", "kelas.jpg", jpeg(800), 800, nil},
		{"valid pdf", "panduan.pdf", pdf(800), 800, nil},
		{"fake jpg", "palsu.jpg", pdf(800), 800, ErrExtensionMimeMismatch},
		{"svg denied", "ikon.svg", []byte("<svg></svg>"), 11, ErrInvalidFilename},
		{"path denied", "../kelas.jpg", jpeg(800), 800, ErrInvalidFilename},
		{"image compression required", "besar.jpg", jpeg(800), MaxImageBytes + 1, ErrImageCompressionRequired},
		{"pdf too large", "besar.pdf", pdf(800), MaxObjectBytes + 1, ErrPayloadTooLarge},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			svc := NewService(newFakeRepo(), newFakeStorage(), fakeAudit{}, "media", MaxObjectBytes)
			_, err := svc.Upload(context.Background(), bytes.NewReader(test.data), test.filename, test.declared, "actor")
			if !errors.Is(err, test.want) {
				t.Fatalf("got %v, want %v", err, test.want)
			}
		})
	}
}

func TestUploadRejectsActualOversizedImageAndCompensates(t *testing.T) {
	storage := newFakeStorage()
	svc := NewService(newFakeRepo(), storage, fakeAudit{}, "media", MaxObjectBytes)
	_, err := svc.Upload(context.Background(), bytes.NewReader(jpeg(int(MaxImageBytes+2))), "besar.jpg", 800, "actor")
	if !errors.Is(err, ErrImageCompressionRequired) {
		t.Fatalf("got %v", err)
	}
	if storage.deletes != 1 || len(storage.objects) != 0 {
		t.Fatalf("oversized object was not compensated: deletes=%d objects=%d", storage.deletes, len(storage.objects))
	}
}

func TestUploadRejectsActualOversizedPDFAndCompensates(t *testing.T) {
	storage := newFakeStorage()
	svc := NewService(newFakeRepo(), storage, fakeAudit{}, "media", MaxObjectBytes)
	_, err := svc.Upload(context.Background(), bytes.NewReader(pdf(int(MaxObjectBytes+2))), "besar.pdf", 800, "actor")
	if !errors.Is(err, ErrPayloadTooLarge) {
		t.Fatalf("got %v", err)
	}
	if storage.deletes != 1 || len(storage.objects) != 0 {
		t.Fatal("oversized PDF was not compensated")
	}
}

func TestUploadCompensatesMetadataFailure(t *testing.T) {
	repo := newFakeRepo()
	repo.failCreate = true
	storage := newFakeStorage()
	svc := NewService(repo, storage, fakeAudit{}, "media", MaxObjectBytes)
	if _, err := svc.Upload(context.Background(), bytes.NewReader(jpeg(800)), "kelas.jpg", 800, "actor"); err == nil {
		t.Fatal("expected metadata error")
	}
	if storage.deletes != 1 || len(storage.objects) != 0 {
		t.Fatal("object was not deleted after metadata failure")
	}
}

func TestRenamePreservesStorageIdentity(t *testing.T) {
	repo := newFakeRepo()
	storage := newFakeStorage()
	svc := NewService(repo, storage, fakeAudit{}, "media", MaxObjectBytes)
	asset, err := svc.Upload(context.Background(), bytes.NewReader(jpeg(800)), "awal.jpg", 800, "actor")
	if err != nil {
		t.Fatal(err)
	}
	key, original := asset.StorageKey, *asset.OriginalFilename
	puts, deletes := storage.puts, storage.deletes
	renamed, err := svc.UpdateMetadata(context.Background(), asset.ID, MetadataUpdate{DisplayFilename: pointer("Materi Kelas.jpg")}, "actor")
	if err != nil {
		t.Fatal(err)
	}
	if renamed.StorageKey != key || *renamed.OriginalFilename != original || storage.puts != puts || storage.deletes != deletes {
		t.Fatal("rename mutated immutable storage identity")
	}
	if _, err := svc.UpdateMetadata(context.Background(), asset.ID, MetadataUpdate{DisplayFilename: pointer("Materi.pdf")}, "actor"); !errors.Is(err, ErrExtensionMimeMismatch) {
		t.Fatalf("got %v", err)
	}
}

func TestPolicyConstantsAndUsageValidation(t *testing.T) {
	policy := Policy()
	if policy.MaxImageBytes != 2_621_440 || policy.MaxObjectBytes != 20_971_520 || policy.MaxMultipartBytes != 33_554_432 {
		t.Fatalf("unexpected policy: %#v", policy)
	}
	if err := ValidateUsage("unknown", "id", "inline", 0); !errors.Is(err, ErrInvalidUsage) {
		t.Fatalf("got %v", err)
	}
	if err := ValidateUsage("faq_item", "b3bd8919-a5cc-47d6-9a5b-f97cb7c4063f", "featured", 0); err != nil {
		t.Fatalf("FAQ media usage rejected: %v", err)
	}
	filter, err := NormalizeListFilter(ListFilter{Page: 1, PageSize: 20, Kind: "image"})
	if err != nil || filter.Kind != "image" {
		t.Fatalf("unexpected filter: %#v %v", filter, err)
	}
}

func TestAttachRejectsMissingOwner(t *testing.T) {
	repo := newFakeRepo()
	repo.entityExists = false
	assetID := "6c661d13-1488-4af8-8bf7-72383396a130"
	repo.assets[assetID] = &MediaAsset{ID: assetID, Status: StatusActive}
	svc := NewService(repo, newFakeStorage(), fakeAudit{}, "media", MaxObjectBytes)
	err := svc.AttachUsage(context.Background(), assetID, "news", "b3bd8919-a5cc-47d6-9a5b-f97cb7c4063f", "inline", 0, "actor")
	if !errors.Is(err, ErrUsageEntityNotFound) {
		t.Fatalf("got %v", err)
	}
}

func pointer(value string) *string { return &value }
