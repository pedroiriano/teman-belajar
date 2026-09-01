package postgres

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
	domain "teman-belajar-api/internal/domain/mediagallery"
)

func TestMediaGalleryPublishPublicArchiveIntegration(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	actor := "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"
	mediaID := "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"
	_, err = db.ExecContext(ctx, `INSERT INTO media_assets (id,storage_key,bucket,original_filename,display_filename,detected_mime_type,size_bytes,checksum_sha256,status,created_by,updated_by) VALUES ($1,'task022-fixture','fixture','fixture.png','fixture.png','image/png',8,$2,'active',$3,$3) ON CONFLICT (id) DO NOTHING`, mediaID, "0000000000000000000000000000000000000000000000000000000000000000", actor)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM media_collection_items WHERE media_id=$1`, mediaID)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM media_collections WHERE created_by=$1`, actor)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM media_assets WHERE id=$1`, mediaID)
	})
	repository := NewMediaGalleryRepository(db)
	service := domain.NewService(repository, NewMediaRepository(db), nil)
	alt := "Dokumentasi fixture"
	input := domain.Input{Slug: "task022-fixture", Title: "TASK022 Fixture", Summary: "Fixture disposable untuk verifikasi publik.", Kind: domain.KindImage, Indexable: true, Items: []domain.ItemInput{{MediaID: mediaID, SortOrder: 0, Featured: true, AltText: &alt}}}
	collection, err := service.Create(ctx, input, []string{"Content Editor"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	collection, err = service.Transition(ctx, collection.ID, collection.Version, domain.StatusInReview, []string{"Content Editor"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	collection, err = service.Transition(ctx, collection.ID, collection.Version, domain.StatusApproved, []string{"Reviewer"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	collection, err = service.Transition(ctx, collection.ID, collection.Version, domain.StatusPublished, []string{"Reviewer"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	page, err := service.ListPublic(ctx, domain.Filter{Page: 1, PageSize: 12})
	if err != nil || page.Total < 1 {
		t.Fatalf("public page=%#v err=%v", page, err)
	}
	public, err := service.GetPublic(ctx, input.Slug)
	if err != nil || len(public.Items) != 1 || public.Items[0].MediaID != mediaID {
		t.Fatalf("public=%#v err=%v", public, err)
	}
	if _, err = service.Transition(ctx, collection.ID, collection.Version, domain.StatusArchived, []string{"Content Editor"}, actor); err != nil {
		t.Fatal(err)
	}
	if _, err = service.GetPublic(ctx, input.Slug); err == nil {
		t.Fatal("archived collection remained public")
	}
	inUse, err := NewMediaRepository(db).HasActiveUsages(ctx, mediaID)
	if err != nil {
		t.Fatal(err)
	}
	if inUse {
		t.Fatal("archived collection still blocks official asset cleanup")
	}
}
