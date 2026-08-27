package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"

	"teman-belajar-api/internal/domain/microlearning"
)

func TestMicrolearningAuthoringPublicationAndProgressIntegration(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required for Microlearning repository integration")
	}

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if closeErr := db.Close(); closeErr != nil {
			t.Errorf("close integration database: %v", closeErr)
		}
	})

	ctx := context.Background()
	repo := NewMicrolearningRepository(db)
	service := microlearning.NewService(repo, nil)
	if _, err := db.ExecContext(ctx, `DELETE FROM microlearning_items WHERE created_by='task014-integration-editor' AND slug LIKE 'task014-integration-%'`); err != nil {
		t.Fatalf("remove stale integration fixture: %v", err)
	}
	slug := fmt.Sprintf("task014-integration-%d", time.Now().UTC().UnixNano())
	item, err := service.Create(ctx, microlearning.Input{
		Slug:            slug,
		Title:           "Materi Integrasi TASK-014",
		Summary:         "Materi singkat untuk membuktikan isolasi publik dan progres.",
		Body:            "Isi editorial yang cukup panjang untuk pengujian integrasi Microlearning.",
		Format:          microlearning.FormatQuick,
		DurationMinutes: 5,
		Indexable:       true,
	}, []string{"Content Editor"}, "task014-integration-editor")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if _, cleanupErr := db.ExecContext(context.Background(), `DELETE FROM microlearning_items WHERE id=$1`, item.ID); cleanupErr != nil {
			t.Errorf("cleanup microlearning fixture: %v", cleanupErr)
		}
	})

	if _, err := service.GetPublic(ctx, slug); !errors.Is(err, microlearning.ErrNotFound) {
		t.Fatalf("draft must remain private, got %v", err)
	}
	for _, transition := range []struct {
		status microlearning.Status
		roles  []string
	}{
		{microlearning.StatusInReview, []string{"Content Editor"}},
		{microlearning.StatusApproved, []string{"Reviewer"}},
		{microlearning.StatusPublished, []string{"Reviewer"}},
	} {
		item, err = service.Transition(ctx, item.ID, transition.status, transition.roles, "task014-integration-actor")
		if err != nil {
			t.Fatalf("transition to %s: %v", transition.status, err)
		}
	}

	publicItem, err := service.GetPublic(ctx, slug)
	if err != nil {
		t.Fatal(err)
	}
	if publicItem.Status != microlearning.StatusPublished || publicItem.PublishedAt == nil {
		t.Fatalf("unexpected public state: %#v", publicItem)
	}

	input := microlearning.ProgressInput{ProgressPercent: 45, PositionSeconds: 0}
	first, err := service.SaveProgress(ctx, item.ID, "task014-integration-learner", input)
	if err != nil {
		t.Fatal(err)
	}
	second, err := service.SaveProgress(ctx, item.ID, "task014-integration-learner", input)
	if err != nil {
		t.Fatal(err)
	}
	if !first.UpdatedAt.Equal(second.UpdatedAt) {
		t.Fatalf("idempotent progress changed updated_at: %s != %s", first.UpdatedAt, second.UpdatedAt)
	}
}
