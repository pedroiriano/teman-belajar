package postgres

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"teman-belajar-api/internal/domain/discoverability"
)

func TestDiscoverabilityRepositoryTaxonomyRelationsAndPublishedRedirect(t *testing.T) {
	db := getTestDB(t)
	t.Cleanup(func() { _ = db.Close() })
	var available bool
	if err := db.QueryRow(`SELECT to_regclass('public.seo_profiles') IS NOT NULL`).Scan(&available); err != nil || !available {
		t.Skip("migration 016 is not available in the integration database")
	}
	ctx := context.Background()
	repo := NewDiscoverabilityRepository(db)
	svc := discoverability.NewService(repo)
	actor := uuid.NewString()
	newsID := uuid.NewString()
	oldSlug := "seo-old-" + uuid.NewString()[:8]
	newSlug := "seo-new-" + uuid.NewString()[:8]
	if _, err := db.Exec(`INSERT INTO news(id,slug,title,excerpt,body,status,published_at,created_by,updated_by) VALUES($1,$2,'SEO integration','Summary','Body','published',$3,$4,$4)`, newsID, oldSlug, time.Now().UTC(), actor); err != nil {
		t.Fatal(err)
	}
	var categoryID, tagID string
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM slug_redirects WHERE content_id=$1`, newsID)
		_, _ = db.Exec(`DELETE FROM seo_profiles WHERE content_id=$1`, newsID)
		_, _ = db.Exec(`DELETE FROM content_tags WHERE content_id=$1`, newsID)
		_, _ = db.Exec(`DELETE FROM news WHERE id=$1`, newsID)
		if categoryID != "" {
			_, _ = db.Exec(`DELETE FROM categories WHERE id=$1`, categoryID)
		}
		if tagID != "" {
			_, _ = db.Exec(`DELETE FROM tags WHERE id=$1`, tagID)
		}
	})
	category, err := svc.CreateTerm(ctx, discoverability.CreateTermInput{Kind: discoverability.KindCategory, Domain: "public", Name: "SPBE " + newsID[:8], Slug: "spbe-" + newsID[:8]}, actor)
	if err != nil {
		t.Fatal(err)
	}
	categoryID = category.ID
	_, err = svc.CreateTerm(ctx, discoverability.CreateTermInput{Kind: discoverability.KindCategory, Domain: "public", Name: " spbe " + newsID[:8], Slug: "spbe-duplicate-" + newsID[:8]}, actor)
	if !errors.Is(err, discoverability.ErrConflict) {
		t.Fatalf("normalized duplicate accepted: %v", err)
	}
	tag, err := svc.CreateTerm(ctx, discoverability.CreateTermInput{Kind: discoverability.KindTag, Name: "Keamanan " + newsID[:8], Slug: "keamanan-" + newsID[:8]}, actor)
	if err != nil {
		t.Fatal(err)
	}
	tagID = tag.ID
	profile, err := svc.SaveProfile(ctx, discoverability.ContentNews, newsID, discoverability.ProfileInput{Slug: newSlug, CategoryID: &categoryID, TagIDs: []string{tagID}, SEOTitle: "SEO title", MetaDescription: "SEO description", Indexable: true}, actor)
	if err != nil {
		t.Fatal(err)
	}
	if profile.CategoryID == nil || *profile.CategoryID != categoryID || len(profile.TagIDs) != 1 || profile.TagIDs[0] != tagID {
		t.Fatalf("relations not persisted: %+v", profile)
	}
	redirect, err := svc.ResolveRedirect(ctx, discoverability.ContentNews, oldSlug)
	if err != nil {
		t.Fatal(err)
	}
	if redirect.Location != "/news/"+newSlug || redirect.Status != 308 {
		t.Fatalf("unexpected redirect: %+v", redirect)
	}
	reuseID := uuid.NewString()
	if _, err = db.Exec(`INSERT INTO news(id,slug,title,excerpt,body,status,created_by,updated_by) VALUES($1,$2,'History collision','Summary','Body','draft',$3,$3)`, reuseID, oldSlug, actor); err == nil {
		_, _ = db.Exec(`DELETE FROM news WHERE id=$1`, reuseID)
		t.Fatal("historical published slug was reusable by another content record")
	}
	entries, err := svc.Sitemap(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !containsSitemap(entries, "/news/"+newSlug) || containsSitemap(entries, "/news/"+oldSlug) {
		t.Fatalf("sitemap current/history policy failed: %+v", entries)
	}
	landing, err := svc.Landing(ctx, discoverability.KindTag, tag.Slug)
	if err != nil {
		t.Fatal(err)
	}
	if landing.Indexable {
		t.Fatal("thin tag landing must be noindex")
	}
	_, err = svc.SaveProfile(ctx, discoverability.ContentNews, newsID, discoverability.ProfileInput{Slug: oldSlug, Indexable: true}, actor)
	if !errors.Is(err, discoverability.ErrRedirectCycle) {
		t.Fatalf("redirect cycle accepted: %v", err)
	}
	_, err = svc.SaveProfile(ctx, discoverability.ContentNews, newsID, discoverability.ProfileInput{Slug: newSlug, CategoryID: &categoryID, TagIDs: []string{tagID}, Indexable: false}, actor)
	if err != nil {
		t.Fatal(err)
	}
	entries, err = svc.Sitemap(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if containsSitemap(entries, "/news/"+newSlug) {
		t.Fatal("noindex content leaked into sitemap")
	}
}

func containsSitemap(entries []discoverability.SitemapEntry, url string) bool {
	for _, entry := range entries {
		if entry.URL == url {
			return true
		}
	}
	return false
}
