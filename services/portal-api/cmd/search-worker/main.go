package main

import (
	"context"
	"database/sql"
	"log"
	"net/url"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"teman-belajar-api/internal/adapters/moodle"
	"teman-belajar-api/internal/searchindex"
)

func main() {
	databaseURL := required("DATABASE_URL")
	meiliURL := requiredURL("MEILI_URL")
	meiliKey := required("MEILI_MASTER_KEY")
	meiliIndexName := required("MEILI_INDEX_NAME")
	moodleURL := requiredURL("MOODLE_INTERNAL_BASE_URL")
	moodlePublicURL := requiredURL("MOODLE_PUBLIC_BASE_URL")
	moodleToken := required("TB_MOODLE_WEBSERVICE_TOKEN")
	interval := duration("SYNC_INTERVAL", time.Minute)

	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		log.Fatalf("open Portal database: %v", err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		log.Fatalf("connect Portal database: %v", err)
	}

	moodleClient := moodle.NewClient(moodle.Config{BaseURL: moodleURL, PublicBaseURL: moodlePublicURL, Token: moodleToken, Timeout: 10 * time.Second})
	index := searchindex.NewMeilisearchIndex(meiliURL, meiliKey, meiliIndexName)
	syncer := searchindex.NewSyncer(index,
		searchindex.NewNewsSource(db),
		searchindex.NewKnowledgeSource(db),
		searchindex.NewAnnouncementSource(db),
		searchindex.NewFAQSource(db),
		searchindex.NewMicrolearningSource(db),
		searchindex.NewCourseSource(moodleClient),
	)

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()
	configureCtx, configureCancel := context.WithTimeout(ctx, 30*time.Second)
	if err := syncer.Configure(configureCtx); err != nil {
		configureCancel()
		log.Fatalf("configure search index: %v", err)
	}
	configureCancel()

	run := func() {
		cycleCtx, cycleCancel := context.WithTimeout(ctx, 45*time.Second)
		defer cycleCancel()
		for sourceType, report := range syncer.Sync(cycleCtx) {
			if report.Error != nil {
				log.Printf("search sync source=%s status=failed error=%v", sourceType, report.Error)
				continue
			}
			log.Printf("search sync source=%s status=succeeded documents=%d", sourceType, report.Count)
		}
	}
	run()
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			log.Print("search worker stopped")
			return
		case <-ticker.C:
			run()
		}
	}
}

func required(name string) string {
	value := os.Getenv(name)
	if value == "" {
		log.Fatalf("missing required environment variable: %s", name)
	}
	return value
}

func requiredURL(name string) string {
	value := required(name)
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		log.Fatalf("invalid URL in %s", name)
	}
	return value
}

func duration(name string, fallback time.Duration) time.Duration {
	value := os.Getenv(name)
	if value == "" {
		return fallback
	}
	parsed, err := time.ParseDuration(value)
	if err != nil || parsed < 10*time.Second {
		log.Fatalf("invalid duration in %s", name)
	}
	return parsed
}
