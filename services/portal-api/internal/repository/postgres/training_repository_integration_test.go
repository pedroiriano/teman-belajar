package postgres

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/lib/pq"
	"teman-belajar-api/internal/domain/training"
)

func TestTrainingRepositoryPublicPublicationIsolation(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required for training repository integration")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	ids := []string{"7f130000-0000-4000-8000-000000000001", "7f130000-0000-4000-8000-000000000002"}
	defer func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM training_programs WHERE id = ANY($1)`, pq.Array(ids))
	}()
	now := time.Now().UTC()
	repo := NewTrainingRepository(db)
	published := &training.Program{ID: ids[0], Slug: "program-publik-test", Title: "Program publik test", Summary: "Ringkasan program publik untuk integration test.", Description: "Deskripsi program publik yang cukup panjang untuk integration test.", Status: training.StatusPublished, Version: 1, PublishedAt: &now, CreatedAt: now, UpdatedAt: now, Courses: []training.CourseRef{{MoodleCourseID: 10, SortOrder: 10, Required: true}}}
	draft := &training.Program{ID: ids[1], Slug: "program-rahasia-test", Title: "DRAFT_SECRET_TRAINING_PROGRAM", Summary: "Ringkasan program rahasia untuk integration test.", Description: "Deskripsi program rahasia yang cukup panjang untuk integration test.", Status: training.StatusDraft, Version: 1, CreatedAt: now, UpdatedAt: now, Courses: []training.CourseRef{{MoodleCourseID: 20, SortOrder: 10, Required: true}}}
	if err := repo.Create(ctx, published, ""); err != nil {
		t.Fatal(err)
	}
	if err := repo.Create(ctx, draft, ""); err != nil {
		t.Fatal(err)
	}
	items, total, err := repo.ListPublic(ctx, training.ListFilter{Query: "program", Page: 1, PageSize: 20})
	if err != nil {
		t.Fatal(err)
	}
	if total < 1 {
		t.Fatalf("expected at least the published fixture")
	}
	for _, item := range items {
		if item.ID == draft.ID || item.Title == draft.Title {
			t.Fatalf("draft leaked into public list: %#v", item)
		}
	}
	detail, err := repo.GetPublishedBySlug(ctx, published.Slug)
	if err != nil || len(detail.Courses) != 1 || detail.Courses[0].MoodleCourseID != 10 {
		t.Fatalf("composition not loaded: detail=%#v err=%v", detail, err)
	}
}
