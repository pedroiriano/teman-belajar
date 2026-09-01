package mediagallery

import (
	"context"
	"errors"
	"testing"
	"time"

	"teman-belajar-api/internal/domain/media"
)

const imageID = "11111111-1111-4111-8111-111111111111"
const videoID = "22222222-2222-4222-8222-222222222222"

type fakeRepository struct {
	collection  *Collection
	publicCalls int
}

func (repo *fakeRepository) Create(_ context.Context, input Input, _ string) (*Collection, error) {
	repo.collection = fromInput("33333333-3333-4333-8333-333333333333", input)
	return repo.collection, nil
}
func (repo *fakeRepository) Update(_ context.Context, id string, version int64, input Input, _ string) (*Collection, error) {
	if repo.collection == nil || repo.collection.Version != version {
		return nil, ErrVersionConflict
	}
	repo.collection = fromInput(id, input)
	repo.collection.Version = version + 1
	return repo.collection, nil
}
func (repo *fakeRepository) Transition(_ context.Context, _ string, version int64, next, _ string) (*Collection, error) {
	if repo.collection == nil || repo.collection.Version != version {
		return nil, ErrVersionConflict
	}
	repo.collection.Status = next
	repo.collection.Version++
	return repo.collection, nil
}
func (repo *fakeRepository) GetAdmin(context.Context, string) (*Collection, error) {
	if repo.collection == nil {
		return nil, ErrNotFound
	}
	return repo.collection, nil
}
func (repo *fakeRepository) ListAdmin(context.Context, Filter) (Page, error) {
	return Page{Data: []Collection{}}, nil
}
func (repo *fakeRepository) GetPublic(context.Context, string) (*Collection, error) {
	repo.publicCalls++
	if repo.collection == nil {
		return nil, ErrNotFound
	}
	return repo.collection, nil
}
func (repo *fakeRepository) ListPublic(context.Context, Filter) (Page, error) {
	repo.publicCalls++
	return Page{Data: []Collection{}, Page: 1, PageSize: 12}, nil
}

type fakeMedia struct{ assets map[string]*media.MediaAsset }

func (reader fakeMedia) GetAssetByID(_ context.Context, id string) (*media.MediaAsset, error) {
	asset := reader.assets[id]
	if asset == nil {
		return nil, media.ErrAssetNotFound
	}
	return asset, nil
}

func fromInput(id string, input Input) *Collection {
	items := []Item{}
	for index, item := range input.Items {
		mime := "image/png"
		if input.Kind == KindVideo {
			mime = "video/mp4"
		}
		items = append(items, Item{ID: id + string(rune(index)), MediaID: item.MediaID, SortOrder: item.SortOrder, Featured: item.Featured, Caption: item.Caption, AltText: item.AltText, Decorative: item.Decorative, Transcript: item.Transcript, MimeType: mime})
	}
	return &Collection{ID: id, Slug: input.Slug, Title: input.Title, Summary: input.Summary, Kind: input.Kind, Status: StatusDraft, Featured: input.Featured, Indexable: input.Indexable, Version: 1, UpdatedAt: time.Now(), Items: items}
}
func textPointer(value string) *string { return &value }
func validImageInput() Input {
	return Input{Slug: "galeri-belajar", Title: "Galeri Belajar", Summary: "Dokumentasi kegiatan belajar yang terkurasi.", Kind: KindImage, Indexable: true, Items: []ItemInput{{MediaID: imageID, SortOrder: 0, Featured: true, AltText: textPointer("Peserta sedang belajar")}}}
}

func TestValidateInputRejectsUnsafeAndAmbiguousOrdering(t *testing.T) {
	input := validImageInput()
	input.Title = "<script>"
	if !errors.Is(ValidateInput(input), ErrInvalidInput) {
		t.Fatal("unsafe markup accepted")
	}
	input = validImageInput()
	input.Items = append(input.Items, ItemInput{MediaID: videoID, SortOrder: 0})
	if !errors.Is(ValidateInput(input), ErrInvalidInput) {
		t.Fatal("duplicate order accepted")
	}
}

func TestServiceValidatesMediaSemanticsAndRoles(t *testing.T) {
	repo := &fakeRepository{}
	reader := fakeMedia{assets: map[string]*media.MediaAsset{imageID: {ID: imageID, Status: media.StatusActive, DetectedMimeType: "image/png"}, videoID: {ID: videoID, Status: media.StatusActive, DetectedMimeType: "video/mp4"}}}
	service := NewService(repo, reader, nil)
	if _, err := service.Create(context.Background(), validImageInput(), []string{"Reviewer"}, "actor"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("reviewer create=%v", err)
	}
	input := validImageInput()
	input.Items[0].AltText = nil
	if _, err := service.Create(context.Background(), input, []string{"Content Editor"}, "actor"); !errors.Is(err, ErrInvalidMedia) {
		t.Fatalf("missing alt=%v", err)
	}
	imageFromAdmin := validImageInput()
	imageFromAdmin.Items[0].Caption = textPointer("")
	imageFromAdmin.Items[0].Transcript = textPointer("")
	created, err := service.Create(context.Background(), imageFromAdmin, []string{"Content Editor"}, "actor")
	if err != nil {
		t.Fatalf("empty optional Admin fields rejected=%v", err)
	}
	if created.Items[0].Caption != nil || created.Items[0].Transcript != nil {
		t.Fatal("empty optional Admin fields were not normalized")
	}
	video := Input{Slug: "video-belajar", Title: "Video Belajar", Summary: "Video pembelajaran yang telah dikurasi.", Kind: KindVideo, Indexable: true, Items: []ItemInput{{MediaID: videoID, SortOrder: 0}}}
	if _, err := service.Create(context.Background(), video, []string{"Content Editor"}, "actor"); !errors.Is(err, ErrInvalidMedia) {
		t.Fatalf("missing transcript=%v", err)
	}
	video.Items[0].Transcript = textPointer("Transkrip video pembelajaran.")
	if _, err := service.Create(context.Background(), video, []string{"Content Editor"}, "actor"); err != nil {
		t.Fatal(err)
	}
}

func TestPublicCacheInvalidatesAfterMutation(t *testing.T) {
	repo := &fakeRepository{}
	reader := fakeMedia{assets: map[string]*media.MediaAsset{imageID: {ID: imageID, Status: media.StatusActive, DetectedMimeType: "image/png"}}}
	service := NewService(repo, reader, nil)
	if _, err := service.Create(context.Background(), validImageInput(), []string{"Content Editor"}, "actor"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.GetPublic(context.Background(), "galeri-belajar"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.GetPublic(context.Background(), "galeri-belajar"); err != nil {
		t.Fatal(err)
	}
	if repo.publicCalls != 1 {
		t.Fatalf("cache calls=%d", repo.publicCalls)
	}
	updated := validImageInput()
	updated.Title = "Galeri Belajar Baru"
	if _, err := service.Update(context.Background(), repo.collection.ID, repo.collection.Version, updated, []string{"Content Editor"}, "actor"); err != nil {
		t.Fatal(err)
	}
	if _, err := service.GetPublic(context.Background(), "galeri-belajar"); err != nil {
		t.Fatal(err)
	}
	if repo.publicCalls != 2 {
		t.Fatalf("cache not invalidated calls=%d", repo.publicCalls)
	}
}
