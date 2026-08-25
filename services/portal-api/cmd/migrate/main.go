package main

import (
	"context"
	"log"
	"os"
	"time"

	"teman-belajar-api/internal/migrations"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("Missing required environment variable: DATABASE_URL")
	}

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "/app/migrations"
	}

	policy, err := migrations.ParseChecksumPolicy(os.Getenv("MIGRATION_CHECKSUM_POLICY"))
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Starting database migration runner...")
	db, err := migrations.ConnectWithRetry(dbURL, 30, 2*time.Second)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to database successfully.")
	if err := migrations.Run(context.Background(), db, migrationsDir, policy); err != nil {
		log.Fatal(err)
	}
	log.Println("All migrations applied successfully with checksum verification.")
}
