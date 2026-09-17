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

func TestTrainingRepositoryMultiCohortUpdate(t *testing.T) {
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
	programID := "7f130000-0000-4000-8000-000000000099"
	defer func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM training_programs WHERE id = $1`, programID)
	}()
	now := time.Now().UTC()
	repo := NewTrainingRepository(db)

	cohort1ID := "7f130000-0000-4000-8000-000000000101"
	prog := &training.Program{
		ID:          programID,
		Slug:        "program-multi-cohort-test",
		Title:       "Program Multi Cohort Test",
		Summary:     "Ringkasan program multi cohort test.",
		Description: "Deskripsi program multi cohort test yang panjang.",
		Category:    "Software Engineering",
		Level:       "Menengah",
		Status:      training.StatusPublished,
		Version:     1,
		PublishedAt: &now,
		CreatedAt:   now,
		UpdatedAt:   now,
		Courses:     []training.CourseRef{{MoodleCourseID: 10, SortOrder: 10, Required: true}},
		Cohorts: []training.Cohort{
			{ID: cohort1ID, Label: "Gelombang 1", Status: "scheduled", SortOrder: 10},
		},
	}

	actorID := "7f130000-0000-4000-8000-000000000000"
	if err := repo.Create(ctx, prog, actorID); err != nil {
		t.Fatalf("failed to create program: %v", err)
	}

	// Now update with multi-cohort (Gelombang 1 updated, Gelombang 2 added)
	cohort2ID := "7f130000-0000-4000-8000-000000000102"
	prog.Version = 2
	prog.Cohorts = []training.Cohort{
		{ID: cohort1ID, Label: "Gelombang 1 - Revisi", Status: "completed", SortOrder: 10},
		{ID: cohort2ID, Label: "Gelombang 2 - Baru", Status: "scheduled", SortOrder: 20},
	}

	if err := repo.Update(ctx, prog, 1, actorID); err != nil {
		t.Fatalf("failed to update program with multi cohorts: %v", err)
	}

	fetched, err := repo.GetByID(ctx, programID)
	if err != nil {
		t.Fatalf("failed to get program: %v", err)
	}
	if len(fetched.Cohorts) != 2 {
		t.Fatalf("expected 2 cohorts, got %d", len(fetched.Cohorts))
	}
	if fetched.Cohorts[0].ID != cohort1ID || fetched.Cohorts[0].Label != "Gelombang 1 - Revisi" || fetched.Cohorts[0].Status != "completed" {
		t.Fatalf("cohort 1 was not updated correctly: %#v", fetched.Cohorts[0])
	}
	if fetched.Cohorts[1].ID != cohort2ID || fetched.Cohorts[1].Label != "Gelombang 2 - Baru" || fetched.Cohorts[1].Status != "scheduled" {
		t.Fatalf("cohort 2 was not added correctly: %#v", fetched.Cohorts[1])
	}
}

