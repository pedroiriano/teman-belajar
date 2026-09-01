package postgres

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	domain "teman-belajar-api/internal/domain/learningpath"
)

type learningPathSourceFixture struct{}

func (learningPathSourceFixture) Resolve(_ context.Context, _ domain.ItemKind, ref, _ string) (domain.ResolvedSource, error) {
	return domain.ResolvedSource{Title: "Fixture " + ref, URL: "/fixture/" + ref, State: domain.SourceAvailable, CheckedAt: time.Now().UTC()}, nil
}
func (learningPathSourceFixture) Progress(_ context.Context, _ []domain.Item, _ string) (map[string]domain.ItemProgress, map[string]string) {
	return map[string]domain.ItemProgress{"course": {Progress: 100, State: "completed"}}, map[string]string{"course": "moodle_authoritative"}
}
func (learningPathSourceFixture) Options(context.Context, string) (domain.Options, error) {
	return domain.Options{Data: []domain.Option{}, Provenance: map[string]string{}}, nil
}

func TestLearningPathPublishRevisionBindingIntegration(t *testing.T) {
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
	slug := "task016-integration-fixture"
	t.Cleanup(func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM learning_path_enrollments WHERE path_id IN (SELECT id FROM learning_paths WHERE slug=$1)`, slug)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM learning_path_prerequisites WHERE item_id IN (SELECT i.id FROM learning_path_items i JOIN learning_path_versions v ON v.id=i.path_version_id JOIN learning_paths p ON p.id=v.path_id WHERE p.slug=$1)`, slug)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM learning_path_items WHERE path_version_id IN (SELECT v.id FROM learning_path_versions v JOIN learning_paths p ON p.id=v.path_id WHERE p.slug=$1)`, slug)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM learning_path_versions WHERE path_id IN (SELECT id FROM learning_paths WHERE slug=$1)`, slug)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM learning_paths WHERE slug=$1`, slug)
	})
	svc := domain.NewService(NewLearningPathRepository(db), learningPathSourceFixture{}, nil)
	input := domain.Input{Slug: slug, Title: "Jalur Integrasi", Summary: "Fixture integrasi jalur belajar yang disposable.", Description: "Fixture untuk membuktikan publikasi dan stabilitas versi learner.", Items: []domain.ItemInput{{Key: "course", Kind: domain.KindCourse, SourceRef: "10", Label: "Course fixture", Required: true, Milestone: true}}}
	path, err := svc.Create(ctx, input, []string{"Content Editor"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	path, err = svc.Transition(ctx, path.ID, domain.StatusInReview, []string{"Content Editor"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	path, err = svc.Transition(ctx, path.ID, domain.StatusApproved, []string{"Reviewer"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	path, err = svc.Transition(ctx, path.ID, domain.StatusPublished, []string{"Reviewer"}, actor)
	if err != nil {
		t.Fatal(err)
	}
	first, err := svc.Progress(ctx, slug, "task016-learner")
	if err != nil || first.BoundVersion != 1 || first.ProgressPercent != 100 {
		t.Fatalf("first=%#v err=%v", first, err)
	}
	revision, err := svc.CreateRevision(ctx, path.ID, path.RowVersion, []string{"Content Editor"}, actor)
	if err != nil || revision.Version.Number != 2 {
		t.Fatalf("revision=%#v err=%v", revision, err)
	}
	second, err := svc.Progress(ctx, slug, "task016-learner")
	if err != nil || second.BoundVersion != 1 {
		t.Fatalf("second=%#v err=%v", second, err)
	}
}
