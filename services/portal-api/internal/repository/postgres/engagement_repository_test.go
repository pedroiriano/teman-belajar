package postgres

import (
	"context"
	"database/sql"
	"sync"
	"testing"

	"github.com/google/uuid"

	"teman-belajar-api/internal/domain/engagement"
)

func requireEngagementMigration(t *testing.T, db *sql.DB) {
	t.Helper()
	var tableName sql.NullString
	if err := db.QueryRow(`SELECT to_regclass('public.engagement_bookmarks')::TEXT`).Scan(&tableName); err != nil {
		t.Fatal(err)
	}
	if !tableName.Valid {
		t.Skip("engagement migration is not applied to the integration database")
	}
}

func TestEngagementRepositoryConcurrencyIsolationAndRetention(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()
	requireEngagementMigration(t, db)
	repo := NewEngagementRepository(db)
	ctx := context.Background()
	user := "test-" + uuid.NewString()
	otherUser := "test-" + uuid.NewString()
	target := engagement.Target{Type: engagement.TargetKnowledge, ID: uuid.NewString()}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM engagement_bookmarks WHERE user_subject IN ($1, $2)`, user, otherUser)
		_, _ = db.Exec(`DELETE FROM engagement_ratings WHERE user_subject IN ($1, $2)`, user, otherUser)
		_, _ = db.Exec(`DELETE FROM engagement_recent_views WHERE user_subject IN ($1, $2)`, user, otherUser)
	})

	var wait sync.WaitGroup
	errorsFound := make(chan error, 24)
	for i := 0; i < 8; i++ {
		wait.Add(3)
		go func() { defer wait.Done(); _, err := repo.UpsertBookmark(ctx, user, target); errorsFound <- err }()
		go func(value int) {
			defer wait.Done()
			_, err := repo.UpsertRating(ctx, user, target, value%5+1)
			errorsFound <- err
		}(i)
		go func() { defer wait.Done(); _, err := repo.UpsertRecentView(ctx, user, target, 50); errorsFound <- err }()
	}
	wait.Wait()
	close(errorsFound)
	for err := range errorsFound {
		if err != nil {
			t.Fatalf("concurrent upsert failed: %v", err)
		}
	}

	for table := range map[string]struct{}{"engagement_bookmarks": {}, "engagement_ratings": {}, "engagement_recent_views": {}} {
		var count int
		query := `SELECT COUNT(*) FROM ` + table + ` WHERE user_subject = $1 AND target_type = $2 AND target_id = $3` // #nosec G202 -- table is selected only from this test-owned constant map.
		if err := db.QueryRowContext(ctx, query, user, target.Type, target.ID).Scan(&count); err != nil {
			t.Fatal(err)
		}
		if count != 1 {
			t.Fatalf("%s rows=%d, want 1", table, count)
		}
	}
	var viewCount int64
	if err := db.QueryRowContext(ctx, `SELECT view_count FROM engagement_recent_views WHERE user_subject=$1 AND target_type=$2 AND target_id=$3`, user, target.Type, target.ID).Scan(&viewCount); err != nil {
		t.Fatal(err)
	}
	if viewCount != 8 {
		t.Fatalf("view_count=%d, want 8", viewCount)
	}

	if _, err := repo.UpsertBookmark(ctx, otherUser, target); err != nil {
		t.Fatal(err)
	}
	items, err := repo.ListBookmarks(ctx, user, 50)
	if err != nil {
		t.Fatal(err)
	}
	for _, item := range items {
		if item.UserKey != user {
			t.Fatalf("cross-user bookmark leaked: %#v", item)
		}
	}

	for i := 0; i < 51; i++ {
		if _, err := repo.UpsertRecentView(ctx, otherUser, engagement.Target{Type: engagement.TargetKnowledge, ID: uuid.NewString()}, 50); err != nil {
			t.Fatal(err)
		}
	}
	var retained int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM engagement_recent_views WHERE user_subject=$1`, otherUser).Scan(&retained); err != nil {
		t.Fatal(err)
	}
	if retained != 50 {
		t.Fatalf("retained recent views=%d, want 50", retained)
	}

	var indexCount int
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM pg_indexes WHERE indexname IN ('idx_engagement_bookmarks_user_created','idx_engagement_ratings_target','idx_engagement_recent_views_user_last_viewed')`).Scan(&indexCount); err != nil {
		t.Fatal(err)
	}
	if indexCount != 3 {
		t.Fatalf("engagement indexes=%d, want 3", indexCount)
	}
}
