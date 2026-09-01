package postgres

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"

	_ "github.com/lib/pq"

	application "teman-belajar-api/internal/application/platformconfig"
	domain "teman-belajar-api/internal/domain/platformconfig"
)

func TestPlatformConfigRepositoryVersionPublishRollback(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required for platform configuration integration")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	actor := "TASK020-QA-FIXTURE"
	defer db.ExecContext(context.Background(), `DELETE FROM platform_config_versions WHERE created_by=$1`, actor) // #nosec G104 -- best-effort disposable fixture cleanup
	repository := NewPlatformConfigRepository(db)
	service := application.NewService(repository, nil, nil)
	state, err := repository.GetState(ctx, false)
	if err != nil {
		t.Fatal(err)
	}
	draft, err := service.SaveDraft(ctx, state.HeadVersion, domain.Default(), actor)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := repository.SaveDraft(ctx, state.HeadVersion, domain.Default(), actor); !errors.Is(err, domain.ErrVersionConflict) {
		t.Fatalf("conflict=%v", err)
	}
	published, err := service.Publish(ctx, draft.Version, actor)
	if err != nil || published.Status != "published" {
		t.Fatalf("publish=%#v err=%v", published, err)
	}
	if snapshot := service.Public(ctx); snapshot.Source != "published" || snapshot.Version != published.Version {
		t.Fatalf("public after publish=%#v", snapshot)
	}
	second, err := service.SaveDraft(ctx, published.Version, domain.Default(), actor)
	if err != nil {
		t.Fatal(err)
	}
	rolledBack, err := service.Rollback(ctx, published.Version, second.Version, actor)
	if err != nil {
		t.Fatal(err)
	}
	if rolledBack.Version <= second.Version || rolledBack.BasedOnVersion == nil || *rolledBack.BasedOnVersion != published.Version {
		t.Fatalf("rollback=%#v", rolledBack)
	}
	current, err := repository.GetPublished(ctx)
	if err != nil || current.Version != rolledBack.Version {
		t.Fatalf("current=%#v err=%v", current, err)
	}
	if snapshot := service.Public(ctx); snapshot.Source != "published" || snapshot.Version != rolledBack.Version {
		t.Fatalf("public after rollback=%#v", snapshot)
	}
}
