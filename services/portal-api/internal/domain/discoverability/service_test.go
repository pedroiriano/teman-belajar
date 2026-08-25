package discoverability

import (
	"context"
	"errors"
	"testing"
	"time"
)

type fakeRepository struct {
	record  *ContentRecord
	profile *Profile
	saved   *ProfileInput
}

func (f *fakeRepository) CreateTerm(_ context.Context, input CreateTermInput, _ string) (*Term, error) {
	return &Term{ID: "term", Kind: input.Kind, Name: input.Name, NormalizedName: NormalizeName(input.Name), Slug: input.Slug, Status: "active"}, nil
}
func (f *fakeRepository) ListTerms(context.Context, TermKind, bool) ([]Term, error)   { return nil, nil }
func (f *fakeRepository) ArchiveTerm(context.Context, TermKind, string, string) error { return nil }
func (f *fakeRepository) GetProfile(context.Context, ContentType, string) (*ContentRecord, *Profile, error) {
	if f.record == nil {
		return nil, nil, ErrNotFound
	}
	return f.record, f.profile, nil
}
func (f *fakeRepository) SaveProfile(_ context.Context, kind ContentType, id string, input ProfileInput, _ string) (*ContentRecord, *Profile, error) {
	f.saved = &input
	return f.record, &Profile{ContentType: kind, ContentID: id, ProfileInput: input, Tags: []Term{}}, nil
}
func (f *fakeRepository) ResolveRedirect(context.Context, ContentType, string) (*Redirect, error) {
	return nil, ErrNotFound
}
func (f *fakeRepository) ListSitemap(context.Context) ([]SitemapEntry, error) { return nil, nil }
func (f *fakeRepository) GetLanding(context.Context, TermKind, string) (*Landing, error) {
	return nil, ErrNotFound
}

func TestNormalizeNamePreventsCaseVariants(t *testing.T) {
	for _, value := range []string{"SPBE", " spbe ", "Spbe"} {
		if got := NormalizeName(value); got != "spbe" {
			t.Fatalf("NormalizeName(%q)=%q", value, got)
		}
	}
}

func TestValidateSlugRejectsUnsafeAndReservedValues(t *testing.T) {
	for _, value := range []string{"../admin", "https://evil.test", "search", "two--dashes", "a", "UPPER"} {
		if !errors.Is(ValidateSlug(value), ErrInvalid) {
			t.Fatalf("expected %q invalid", value)
		}
	}
	if err := ValidateSlug("panduan-spbe-2026"); err != nil {
		t.Fatalf("valid slug rejected: %v", err)
	}
}

func TestSaveProfileRejectsCanonicalPoisoning(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)
	id := "11111111-1111-4111-8111-111111111111"
	for _, candidate := range []string{"https://evil.test/news/test", "//evil.test/news/test", "/news/../admin", "/knowledge/wrong-type", "/news/test?tracking=1"} {
		_, err := svc.SaveProfile(context.Background(), ContentNews, id, ProfileInput{Slug: "safe-news", Indexable: true, CanonicalPath: &candidate}, "actor")
		if !errors.Is(err, ErrInvalid) {
			t.Fatalf("canonical %q should be rejected, got %v", candidate, err)
		}
	}
}

func TestSaveProfileRejectsDuplicateTags(t *testing.T) {
	repo := &fakeRepository{}
	svc := NewService(repo)
	id := "11111111-1111-4111-8111-111111111111"
	tag := "22222222-2222-4222-8222-222222222222"
	_, err := svc.SaveProfile(context.Background(), ContentNews, id, ProfileInput{Slug: "safe-news", TagIDs: []string{tag, tag}, Indexable: true}, "actor")
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("duplicate tags should fail, got %v", err)
	}
}

func TestMetadataUsesFallbacksAndPublicationGate(t *testing.T) {
	now := time.Now().UTC()
	repo := &fakeRepository{record: &ContentRecord{ID: "id", ContentType: ContentNews, Slug: "berita-spbe", Title: "Judul Konten", Summary: "Ringkasan konten", Status: "published", PublishedAt: &now, UpdatedAt: now}, profile: &Profile{ProfileInput: ProfileInput{Slug: "berita-spbe", Indexable: true}, Category: &Term{ID: "archived-category", Status: "archived"}, Tags: []Term{{ID: "active-tag", Status: "active"}, {ID: "archived-tag", Status: "archived"}}}}
	metadata, err := NewService(repo).Metadata(context.Background(), ContentNews, "id")
	if err != nil {
		t.Fatal(err)
	}
	if metadata.Title != "Judul Konten" || metadata.Description != "Ringkasan konten" || metadata.OpenGraphTitle != "Judul Konten" || metadata.CanonicalPath != "/news/berita-spbe" || metadata.OpenGraphImageURL != "/teman-belajar-social.svg" || metadata.OpenGraphImageAlt != "Teman Belajar" || !metadata.Indexable {
		t.Fatalf("unexpected fallback metadata: %+v", metadata)
	}
	if metadata.Category != nil || len(metadata.Tags) != 1 || metadata.Tags[0].ID != "active-tag" {
		t.Fatalf("archived taxonomy leaked into public metadata: %+v", metadata)
	}
	repo.record.Status = "draft"
	repo.record.PublishedAt = nil
	metadata, err = NewService(repo).Metadata(context.Background(), ContentNews, "id")
	if err != nil {
		t.Fatal(err)
	}
	if metadata.Indexable {
		t.Fatal("draft content must never be indexable")
	}
}
