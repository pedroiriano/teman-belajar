package postgres

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/media"
)

func TestMediaRepositorySearchPaginationRenameAndIdempotentUsage(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	repo := NewMediaRepository(db)
	ctx := context.Background()
	actor := uuid.New().String()
	now := time.Now().UTC()
	marker := "media-test-" + uuid.New().String()
	ids := []string{uuid.New().String(), uuid.New().String()}
	for index, id := range ids {
		original := marker + "-original-" + string(rune('a'+index)) + ".jpg"
		display := marker + "-display-" + string(rune('a'+index)) + ".jpg"
		asset := &media.MediaAsset{ID: id, StorageKey: "test/" + id, Bucket: "test", OriginalFilename: &original, DisplayFilename: &display, DetectedMimeType: "image/jpeg", SizeBytes: 4, ChecksumSHA256: marker, Status: media.StatusActive, CreatedAt: now, CreatedBy: &actor, UpdatedAt: now, UpdatedBy: &actor}
		if err := repo.CreateAsset(ctx, asset); err != nil {
			t.Fatal(err)
		}
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM media_usages WHERE media_id IN ($1,$2)`, ids[0], ids[1])
		_, _ = db.ExecContext(context.Background(), `DELETE FROM media_assets WHERE id IN ($1,$2)`, ids[0], ids[1])
	})

	items, total, err := repo.ListAdminAssets(ctx, media.ListFilter{Page: 1, PageSize: 1, Query: marker, Kind: "image"})
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 || len(items) != 1 {
		t.Fatalf("total=%d len=%d", total, len(items))
	}
	wantFirst := ids[0]
	if ids[1] > ids[0] {
		wantFirst = ids[1]
	}
	if items[0].ID != wantFirst {
		t.Fatalf("deterministic tie-break got %s want %s", items[0].ID, wantFirst)
	}
	if documents, count, err := repo.ListAdminAssets(ctx, media.ListFilter{Page: 1, PageSize: 20, Query: marker, Kind: "document"}); err != nil || count != 0 || len(documents) != 0 {
		t.Fatalf("document filter leaked image: count=%d len=%d err=%v", count, len(documents), err)
	}

	original := *items[0].OriginalFilename
	storageKey := items[0].StorageKey
	renamed := marker + "-renamed.jpg"
	updated, err := repo.UpdateMetadata(ctx, items[0].ID, media.MetadataUpdate{DisplayFilename: &renamed}, actor)
	if err != nil {
		t.Fatal(err)
	}
	if *updated.DisplayFilename != renamed || *updated.OriginalFilename != original || updated.StorageKey != storageKey {
		t.Fatal("rename changed immutable identity")
	}

	entityID := uuid.New().String()
	usage := media.MediaUsage{ID: uuid.New().String(), MediaID: items[0].ID, EntityType: "news", EntityID: entityID, UsageRole: "inline", CreatedAt: now, CreatedBy: &actor}
	if err := repo.AttachUsage(ctx, usage); err != nil {
		t.Fatal(err)
	}
	usage.ID = uuid.New().String()
	usage.SortOrder = 4
	if err := repo.AttachUsage(ctx, usage); err != nil {
		t.Fatal(err)
	}
	var usageCount int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM media_usages WHERE media_id=$1 AND entity_type='news' AND entity_id=$2 AND usage_role='inline'`, items[0].ID, entityID).Scan(&usageCount); err != nil {
		t.Fatal(err)
	}
	if usageCount != 1 {
		t.Fatalf("usage count=%d", usageCount)
	}
}
