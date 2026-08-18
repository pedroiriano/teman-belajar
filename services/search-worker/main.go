package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"regexp"
	"strings"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"github.com/meilisearch/meilisearch-go"
)

type SearchDocument struct {
	ID          string   `json:"id"`
	Type        string   `json:"type"`
	Title       string   `json:"title"`
	Description string   `json:"description"`
	URL         string   `json:"url"`
	ImageURL    string   `json:"image_url,omitempty"`
	Tags        []string `json:"tags,omitempty"`
}

func stripHTML(content string) string {
	r := regexp.MustCompile(`<[^>]*>`)
	return strings.TrimSpace(r.ReplaceAllString(content, " "))
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	meiliURL := getEnv("MEILI_URL", "http://search:7700")
	meiliKey := os.Getenv("MEILI_MASTER_KEY")
	syncInterval := getEnv("SYNC_INTERVAL", "60s")

	moodleURL := getEnv("MOODLE_INTERNAL_BASE_URL", "http://moodle")
	moodleToken := os.Getenv("TB_MOODLE_WEBSERVICE_TOKEN")

	interval, err := time.ParseDuration(syncInterval)
	if err != nil {
		interval = 60 * time.Second
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	meiliClient := meilisearch.New(meiliURL, meilisearch.WithAPIKey(meiliKey))

	// Ensure index exists and settings are applied
	index := meiliClient.Index("teman_belajar")

	// Create index if not exists (ignore error if exists)
	meiliClient.CreateIndex(&meilisearch.IndexConfig{
		Uid:        "teman_belajar",
		PrimaryKey: "id",
	})

	index.UpdateFilterableAttributes(&[]interface{}{"type", "tags"})
	index.UpdateSearchableAttributes(&[]string{"title", "description"})

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	log.Printf("Starting search worker, syncing every %v", interval)

	go func() {
		<-sigChan
		log.Println("Shutting down worker...")
		cancel()
	}()

	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial sync
	syncAll(ctx, db, index, moodleURL, moodleToken)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			syncAll(ctx, db, index, moodleURL, moodleToken)
		}
	}
}

func syncAll(ctx context.Context, db *sql.DB, index meilisearch.IndexManager, moodleURL, moodleToken string) {
	log.Println("Starting sync cycle...")
	var docs []SearchDocument

	// 1. Sync Knowledge
	knowledgeDocs, err := fetchKnowledge(db)
	if err != nil {
		log.Printf("Error fetching knowledge: %v", err)
	} else {
		docs = append(docs, knowledgeDocs...)
	}

	// 2. Sync News
	newsDocs, err := fetchNews(db)
	if err != nil {
		log.Printf("Error fetching news: %v", err)
	} else {
		docs = append(docs, newsDocs...)
	}

	// 3. Sync Announcements
	announcementDocs, err := fetchAnnouncements(db)
	if err != nil {
		log.Printf("Error fetching announcements: %v", err)
	} else {
		docs = append(docs, announcementDocs...)
	}

	// 4. Sync Courses from Moodle WS
	if moodleToken != "" {
		courseDocs, err := fetchMoodleCourses(moodleURL, moodleToken)
		if err != nil {
			log.Printf("Error fetching moodle courses: %v", err)
		} else {
			docs = append(docs, courseDocs...)
		}
	}

	if len(docs) > 0 {
		_, err = index.AddDocuments(docs, &meilisearch.DocumentOptions{
			PrimaryKey: meilisearch.StringPtr("id"),
		})
		if err != nil {
			log.Printf("Failed to index documents: %v", err)
		} else {
			log.Printf("Successfully pushed %d documents to Meilisearch", len(docs))
		}
	}
	log.Println("Sync cycle completed.")
}

func fetchKnowledge(db *sql.DB) ([]SearchDocument, error) {
	rows, err := db.Query("SELECT id, title, summary, slug, cover_image_id FROM knowledge_articles WHERE status = 'published'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []SearchDocument
	for rows.Next() {
		var id, title, summary, slug string
		var coverID sql.NullString
		if err := rows.Scan(&id, &title, &summary, &slug, &coverID); err != nil {
			continue
		}

		doc := SearchDocument{
			ID:          "knowledge_" + id,
			Type:        "knowledge",
			Title:       title,
			Description: stripHTML(summary),
			URL:         "/knowledge/" + slug,
		}
		if coverID.Valid && coverID.String != "" {
			doc.ImageURL = "/api/v1/media/" + coverID.String + "/content"
		}
		docs = append(docs, doc)
	}
	return docs, nil
}

func fetchNews(db *sql.DB) ([]SearchDocument, error) {
	rows, err := db.Query("SELECT id, title, summary, slug, cover_image_id FROM cms_news WHERE status = 'published'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []SearchDocument
	for rows.Next() {
		var id, title, summary, slug string
		var coverID sql.NullString
		if err := rows.Scan(&id, &title, &summary, &slug, &coverID); err != nil {
			continue
		}

		doc := SearchDocument{
			ID:          "news_" + id,
			Type:        "news",
			Title:       title,
			Description: stripHTML(summary),
			URL:         "/news/" + slug,
		}
		if coverID.Valid && coverID.String != "" {
			doc.ImageURL = "/api/v1/media/" + coverID.String + "/content"
		}
		docs = append(docs, doc)
	}
	return docs, nil
}

func fetchAnnouncements(db *sql.DB) ([]SearchDocument, error) {
	rows, err := db.Query("SELECT id, title, summary, target_url, cover_image_id FROM cms_announcements WHERE status = 'active'")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var docs []SearchDocument
	for rows.Next() {
		var id, title, summary, targetURL string
		var coverID sql.NullString
		if err := rows.Scan(&id, &title, &summary, &targetURL, &coverID); err != nil {
			continue
		}

		url := targetURL
		if url == "" {
			url = "/announcements" // Fallback
		}

		doc := SearchDocument{
			ID:          "announcement_" + id,
			Type:        "announcement",
			Title:       title,
			Description: stripHTML(summary),
			URL:         url,
		}
		if coverID.Valid && coverID.String != "" {
			doc.ImageURL = "/api/v1/media/" + coverID.String + "/content"
		}
		docs = append(docs, doc)
	}
	return docs, nil
}

func fetchMoodleCourses(baseURL, token string) ([]SearchDocument, error) {
	apiURL := fmt.Sprintf("%s/webservice/rest/server.php?wstoken=%s&wsfunction=core_course_get_courses&moodlewsrestformat=json", baseURL, token)

	resp, err := http.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Check if Moodle returned an error object
	var errResp struct {
		Exception string `json:"exception"`
		Message   string `json:"message"`
	}
	if json.Unmarshal(body, &errResp) == nil && errResp.Exception != "" {
		return nil, fmt.Errorf("moodle exception: %s", errResp.Message)
	}

	var courses []struct {
		ID        int    `json:"id"`
		Shortname string `json:"shortname"`
		Fullname  string `json:"fullname"`
		Summary   string `json:"summary"`
	}

	if err := json.Unmarshal(body, &courses); err != nil {
		return nil, err
	}

	var docs []SearchDocument
	for _, c := range courses {
		if c.ID == 1 {
			// Skip site frontpage course
			continue
		}
		docs = append(docs, SearchDocument{
			ID:          fmt.Sprintf("course_%d", c.ID),
			Type:        "course",
			Title:       c.Fullname,
			Description: stripHTML(c.Summary),
			URL:         fmt.Sprintf("/my-learning/courses/%d", c.ID),
		})
	}
	return docs, nil
}
