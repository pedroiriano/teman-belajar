package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"
	"teman-belajar-api/internal/domain/analytics"
	"teman-belajar-api/internal/observability"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	shutdown, err := observability.InitTracer(ctx, "teman-belajar-analytics-worker")
	if err != nil {
		log.Fatalf("Failed to init tracer: %v", err)
	}
	defer shutdown(ctx)

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Missing required environment variable: DATABASE_URL")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	repo := analytics.NewPostgresRepository(db)

	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	log.Println("Analytics Worker started")

	for {
		select {
		case <-stop:
			log.Println("Shutting down analytics worker")
			return
		case <-ticker.C:
			log.Println("Running analytics rollup")
			now := time.Now()
			
			// Rollup page views
			if err := repo.RollupPageDaily(ctx, now); err != nil {
				log.Printf("Error rolling up page daily: %v", err)
			}
			// Rollup SSO
			if err := repo.RollupSSODaily(ctx, now); err != nil {
				log.Printf("Error rolling up sso daily: %v", err)
			}
			// (Moodle integration would happen here or in another cron)
		}
	}
}

