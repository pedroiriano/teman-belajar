package postgres

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
	"teman-belajar-api/internal/domain/cms"
)

func getTestDB(t *testing.T) *sql.DB {
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		// Use a local default if not in CI
		dsn = "postgres://postgres:postgres@localhost:5432/portal_db?sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	err = db.Ping()
	if err != nil {
		t.Skipf("Skipping integration test, database not available: %v", err)
	}

	return db
}

func TestCMSRepository_News(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	repo := NewCMSRepository(db)
	ctx := context.Background()

	authorID := uuid.New().String()
	slug := "test-news-" + uuid.New().String()

	news := &cms.News{
		ID:        uuid.New().String(),
		Title:     "Test News",
		Slug:      slug,
		Excerpt:   "Excerpt",
		Body:      "Body",
		Status:    cms.StatusDraft,
		CreatedBy: &authorID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := repo.CreateNews(ctx, news)
	if err != nil {
		t.Fatalf("Failed to create news: %v", err)
	}

	// Test duplicate slug rejected
	err = repo.CreateNews(ctx, news)
	if err == nil {
		t.Errorf("Expected duplicate slug to be rejected")
	}

	// Test public list hides draft
	publicList, _, err := repo.ListPublicNews(ctx, 1, 10)
	if err != nil {
		t.Fatalf("Failed to list public news: %v", err)
	}
	for _, n := range publicList {
		if n.Slug == slug {
			t.Errorf("Draft news should not appear in public list")
		}
	}

	// Test Update status
	news.Status = cms.StatusPublished
	now := time.Now()
	news.PublishedAt = &now
	news.UpdatedBy = &authorID
	err = repo.UpdateNews(ctx, news)
	if err != nil {
		t.Fatalf("Failed to update status: %v", err)
	}

	// Now it should appear in public list
	publicList, _, err = repo.ListPublicNews(ctx, 1, 100)
	if err != nil {
		t.Fatalf("Failed to list public news: %v", err)
	}

	found := false
	for _, n := range publicList {
		if n.Slug == slug {
			found = true
			break
		}
	}

	if !found {
		t.Errorf("Published news should appear in public list")
	}

	// Clean up
	db.Exec("DELETE FROM cms_news WHERE id = $1", news.ID)
}

func TestCMSRepository_Announcement(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	repo := NewCMSRepository(db)
	ctx := context.Background()

	authorID := uuid.New().String()
	slug := "test-ann-" + uuid.New().String()

	futureStart := time.Now().Add(24 * time.Hour)
	futureEnd := time.Now().Add(48 * time.Hour)

	ann := &cms.Announcement{
		ID:        uuid.New().String(),
		Title:     "Test Ann",
		Slug:      slug,
		Body:      "Body",
		StartAt:   &futureStart,
		EndAt:     &futureEnd,
		Status:    cms.StatusPublished,
		CreatedBy: &authorID,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err := repo.CreateAnnouncement(ctx, ann)
	if err != nil {
		t.Fatalf("Failed to create announcement: %v", err)
	}

	// Test public active list
	publicList, err := repo.ListActiveAnnouncements(ctx)
	if err != nil {
		t.Fatalf("Failed to list active announcements: %v", err)
	}
	for _, a := range publicList {
		if a.Slug == slug {
			t.Errorf("Future announcement should not appear in active list")
		}
	}

	// Clean up
	db.Exec("DELETE FROM cms_announcements WHERE id = $1", ann.ID)
}
