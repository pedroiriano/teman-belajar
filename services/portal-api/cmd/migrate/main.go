package main

import (
	"context"
	"database/sql"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

func main() {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		// Fallback for local docker if not provided
		dbURL = "postgres://teman_belajar_portal:local_password@postgres-portal:5432/teman_belajar?sslmode=disable"
	}

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "/app/migrations"
	}

	log.Println("Starting database migration runner...")

	// Connect to database with retry for docker-compose dependency startup
	var db *sql.DB
	var err error
	maxRetries := 30
	for i := 0; i < maxRetries; i++ {
		db, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = db.Ping()
			if err == nil {
				break
			}
		}
		log.Printf("Waiting for database to be ready (attempt %d/%d)...\n", i+1, maxRetries)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()
	log.Println("Connected to database successfully.")

	// Ensure schema_migrations table exists
	_, err = db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			version VARCHAR(255) UNIQUE NOT NULL,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`)
	if err != nil {
		log.Fatalf("Failed to create schema_migrations table: %v", err)
	}

	// Read migration files
	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		log.Fatalf("Failed to read migrations directory: %v", err)
	}

	var migrationFiles []string
	for _, file := range files {
		if !file.IsDir() && strings.HasSuffix(file.Name(), ".sql") {
			migrationFiles = append(migrationFiles, file.Name())
		}
	}
	sort.Strings(migrationFiles)

	for _, file := range migrationFiles {
		// Check if already applied
		var exists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", file).Scan(&exists)
		if err != nil {
			log.Fatalf("Failed to check migration status for %s: %v", file, err)
		}

		if exists {
			log.Printf("Migration %s already applied, skipping.", file)
			continue
		}

		// Read file content
		content, err := os.ReadFile(filepath.Join(migrationsDir, file))
		if err != nil {
			log.Fatalf("Failed to read migration file %s: %v", file, err)
		}

		// Execute migration in transaction
		ctx := context.Background()
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			log.Fatalf("Failed to start transaction for %s: %v", file, err)
		}

		log.Printf("Applying migration: %s", file)
		_, err = tx.ExecContext(ctx, string(content))
		if err != nil {
			tx.Rollback()
			log.Fatalf("Failed to execute migration %s: %v", file, err)
		}

		_, err = tx.ExecContext(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", file)
		if err != nil {
			tx.Rollback()
			log.Fatalf("Failed to record migration %s: %v", file, err)
		}

		err = tx.Commit()
		if err != nil {
			log.Fatalf("Failed to commit migration %s: %v", file, err)
		}

		log.Printf("Successfully applied migration: %s", file)
	}

	log.Println("All migrations applied successfully.")
}
