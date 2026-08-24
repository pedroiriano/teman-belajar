package searchindex

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"

	domainsearch "teman-belajar-api/internal/domain/search"
)

func TestPostgresSourcesPublicationAndRevisionIsolation(t *testing.T) {
	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("TEST_DATABASE_URL is required for Search source integration")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	tx, err := db.BeginTx(context.Background(), nil)
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback() // #nosec G104 -- defer rollback error is safe to ignore as transaction is already committed or context is canceled

	ctx := context.Background()
	statements := []string{
		`INSERT INTO news (id,slug,title,excerpt,body,status,published_at) VALUES
		 ('71000000-0000-0000-0000-000000000001','search-public-news','SEARCH_PUBLIC_NEWS_TOKEN','','public body','published',NOW()),
		 ('71000000-0000-0000-0000-000000000002','search-draft-news','SEARCH_DRAFT_NEWS_SECRET_TOKEN','','draft body','draft',NULL),
		 ('71000000-0000-0000-0000-000000000003','search-future-news','SEARCH_FUTURE_NEWS_SECRET_TOKEN','','future body','published',NOW()+INTERVAL '1 day')`,
		`INSERT INTO knowledge_articles (id,slug,title,summary,status,published_revision_no,current_revision_no) VALUES
		 ('72000000-0000-0000-0000-000000000001','search-revision-isolation','Revision isolation','','draft',1,2)`,
		`INSERT INTO knowledge_revisions (id,article_id,revision_no,body) VALUES
		 ('72100000-0000-0000-0000-000000000001','72000000-0000-0000-0000-000000000001',1,'SEARCH_PUBLIC_REVISION_TOKEN'),
		 ('72100000-0000-0000-0000-000000000002','72000000-0000-0000-0000-000000000001',2,'SEARCH_DRAFT_SECRET_TOKEN')`,
		`INSERT INTO announcements (id,slug,title,body,status,start_at,end_at,published_at) VALUES
		 ('73000000-0000-0000-0000-000000000001','search-active-announcement','SEARCH_ACTIVE_ANNOUNCEMENT_TOKEN','active','published',NOW()-INTERVAL '1 hour',NOW()+INTERVAL '1 hour',NOW()),
		 ('73000000-0000-0000-0000-000000000002','search-expired-announcement','SEARCH_EXPIRED_ANNOUNCEMENT_SECRET_TOKEN','expired','published',NOW()-INTERVAL '2 hour',NOW()-INTERVAL '1 hour',NOW())`,
	}
	for _, statement := range statements {
		if _, err := tx.ExecContext(ctx, statement); err != nil {
			t.Fatalf("fixture insert: %v", err)
		}
	}

	news, err := NewNewsSource(tx).Fetch(ctx)
	if err != nil {
		t.Fatal(err)
	}
	knowledge, err := NewKnowledgeSource(tx).Fetch(ctx)
	if err != nil {
		t.Fatal(err)
	}
	announcements, err := NewAnnouncementSource(tx).Fetch(ctx)
	if err != nil {
		t.Fatal(err)
	}

	assertToken := func(name, token string, found bool, values []string) {
		t.Helper()
		joined := strings.Join(values, " ")
		if strings.Contains(joined, token) != found {
			t.Fatalf("%s token expectation=%v values=%q", name, found, values)
		}
	}
	newsValues := documentText(news)
	assertToken("published news", "SEARCH_PUBLIC_NEWS_TOKEN", true, newsValues)
	assertToken("draft news", "SEARCH_DRAFT_NEWS_SECRET_TOKEN", false, newsValues)
	assertToken("future news", "SEARCH_FUTURE_NEWS_SECRET_TOKEN", false, newsValues)
	knowledgeValues := documentText(knowledge)
	assertToken("published revision", "SEARCH_PUBLIC_REVISION_TOKEN", true, knowledgeValues)
	assertToken("draft revision", "SEARCH_DRAFT_SECRET_TOKEN", false, knowledgeValues)
	announcementValues := documentText(announcements)
	assertToken("active announcement", "SEARCH_ACTIVE_ANNOUNCEMENT_TOKEN", true, announcementValues)
	assertToken("expired announcement", "SEARCH_EXPIRED_ANNOUNCEMENT_SECRET_TOKEN", false, announcementValues)
}

func documentText(documents []domainsearch.IndexDocument) []string {
	values := make([]string, 0, len(documents)*3)
	for _, document := range documents {
		values = append(values, document.Title, document.Summary, document.BodyText)
	}
	return values
}
