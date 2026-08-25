package postgres

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
	"teman-belajar-api/internal/domain/faq"
)

func TestFAQRepositoryPublicPublicationAndSortIsolation(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required for FAQ repository integration")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	ctx := context.Background()
	categoryID := "7f170000-0000-0000-0000-000000000001"
	defer func() {
		_, _ = db.ExecContext(context.Background(), `DELETE FROM faq_items WHERE category_id=$1`, categoryID)
		_, _ = db.ExecContext(context.Background(), `DELETE FROM faq_categories WHERE id=$1`, categoryID)
	}()
	if _, err := db.ExecContext(ctx, `INSERT INTO faq_categories (id,slug,name,sort_order,status) VALUES ($1,'faq-test','FAQ test',5,'active') ON CONFLICT (id) DO UPDATE SET status='active'`, categoryID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `DELETE FROM faq_items WHERE category_id=$1`, categoryID); err != nil {
		t.Fatal(err)
	}
	fixtures := []struct {
		id, slug, question string
		status             faq.Status
		sort               int
		published          *time.Time
	}{
		{"7f170000-0000-0000-0000-000000000011", "kedua", "Pertanyaan publik kedua?", faq.StatusPublished, 20, pointerTime(time.Now().UTC())},
		{"7f170000-0000-0000-0000-000000000012", "pertama", "Pertanyaan publik pertama?", faq.StatusPublished, 10, pointerTime(time.Now().UTC())},
		{"7f170000-0000-0000-0000-000000000013", "rahasia", "DRAFT_SECRET_FAQ_TOKEN", faq.StatusDraft, 1, nil},
	}
	for _, fixture := range fixtures {
		if _, err := db.ExecContext(ctx, `INSERT INTO faq_items (id,category_id,slug,question,answer,sort_order,status,indexable,version,published_at) VALUES ($1,$2,$3,$4,'Jawaban FAQ minimum.', $5,$6,true,1,$7)`, fixture.id, categoryID, fixture.slug, fixture.question, fixture.sort, fixture.status, fixture.published); err != nil {
			t.Fatal(err)
		}
	}
	groups, total, err := NewFAQRepository(db).ListPublic(ctx, "Pertanyaan publik")
	if err != nil {
		t.Fatal(err)
	}
	if total != 2 || len(groups) != 1 || groups[0].Category.Name != "FAQ test" || groups[0].Items[0].Slug != "pertama" || groups[0].Items[1].Slug != "kedua" {
		t.Fatalf("unexpected public FAQ ordering/isolation: total=%d groups=%#v", total, groups)
	}
}

func pointerTime(value time.Time) *time.Time { return &value }
