package migrations

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"regexp"
	"sort"
	"strings"
	"time"

	_ "github.com/lib/pq"
)

const (
	ChecksumPolicyStrict = "strict"
	ChecksumPolicyAdopt  = "adopt"
)

var migrationFileName = regexp.MustCompile(`^[0-9]{3}_[a-z0-9_]+\.sql$`)

func ConnectWithRetry(dbURL string, maxRetries int, retryDelay time.Duration) (*sql.DB, error) {
	var db *sql.DB
	var err error
	for i := 0; i < maxRetries; i++ {
		db, err = sql.Open("postgres", dbURL)
		if err == nil {
			err = db.Ping()
			if err == nil {
				return db, nil
			}
			_ = db.Close()
		}
		log.Printf("Waiting for database to be ready (attempt %d/%d)...\n", i+1, maxRetries)
		time.Sleep(retryDelay)
	}
	return nil, err
}

func ParseChecksumPolicy(value string) (string, error) {
	if value == "" {
		return ChecksumPolicyStrict, nil
	}
	value = strings.ToLower(strings.TrimSpace(value))
	if value != ChecksumPolicyStrict && value != ChecksumPolicyAdopt {
		return "", fmt.Errorf("MIGRATION_CHECKSUM_POLICY must be %q or %q", ChecksumPolicyStrict, ChecksumPolicyAdopt)
	}
	return value, nil
}

func Run(ctx context.Context, db *sql.DB, migrationsDir, checksumPolicy string) error {
	if _, err := ParseChecksumPolicy(checksumPolicy); err != nil {
		return err
	}
	if err := ensureLedger(ctx, db); err != nil {
		return fmt.Errorf("failed to prepare schema_migrations: %w", err)
	}

	files, err := os.ReadDir(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to read migrations directory: %w", err)
	}
	var migrationFiles []string
	for _, file := range files {
		if !file.IsDir() && migrationFileName.MatchString(file.Name()) {
			migrationFiles = append(migrationFiles, file.Name())
		}
	}
	sort.Strings(migrationFiles)
	if err := rejectOrphanedLedgerRecords(ctx, db, migrationFiles); err != nil {
		return err
	}

	migrationsRoot, err := os.OpenRoot(migrationsDir)
	if err != nil {
		return fmt.Errorf("failed to open migrations root: %w", err)
	}
	defer migrationsRoot.Close()

	for _, file := range migrationFiles {
		content, err := migrationsRoot.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %w", file, err)
		}
		checksum := ChecksumSHA256(content)
		rawChecksum := rawChecksumSHA256(content)

		var recorded sql.NullString
		err = db.QueryRowContext(ctx, "SELECT checksum_sha256 FROM schema_migrations WHERE version = $1", file).Scan(&recorded)
		switch {
		case err == nil:
			if err := verifyOrAdoptChecksum(ctx, db, file, checksum, rawChecksum, recorded, checksumPolicy); err != nil {
				return err
			}
			log.Printf("Migration %s already applied; checksum verified.", file)
			continue
		case !errors.Is(err, sql.ErrNoRows):
			return fmt.Errorf("failed to check migration status for %s: %w", file, err)
		}

		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("failed to start transaction for %s: %w", file, err)
		}
		log.Printf("Applying migration: %s", file)
		// #nosec G701 -- migration SQL is a version-controlled file selected by a strict filename allowlist.
		if _, err = tx.ExecContext(ctx, string(content)); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to execute migration %s: %w", file, err)
		}
		if _, err = tx.ExecContext(ctx, "INSERT INTO schema_migrations (version, checksum_sha256) VALUES ($1, $2)", file, checksum); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("failed to record migration %s: %w", file, err)
		}
		if err = tx.Commit(); err != nil {
			return fmt.Errorf("failed to commit migration %s: %w", file, err)
		}
		log.Printf("Successfully applied migration: %s", file)
	}
	return nil
}

func rejectOrphanedLedgerRecords(ctx context.Context, db *sql.DB, migrationFiles []string) error {
	known := make(map[string]struct{}, len(migrationFiles))
	for _, file := range migrationFiles {
		known[file] = struct{}{}
	}
	rows, err := db.QueryContext(ctx, `SELECT version FROM schema_migrations ORDER BY version`)
	if err != nil {
		return fmt.Errorf("failed to enumerate migration ledger: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return fmt.Errorf("failed to read migration ledger: %w", err)
		}
		if _, exists := known[version]; !exists {
			return fmt.Errorf("migration ledger contains %s but the canonical SQL file is missing", version)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("failed to enumerate migration ledger: %w", err)
	}
	return nil
}

func ensureLedger(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			version VARCHAR(255) UNIQUE NOT NULL,
			checksum_sha256 CHAR(64),
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
		)
	`); err != nil {
		return err
	}
	_, err := db.ExecContext(ctx, `ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum_sha256 CHAR(64)`)
	return err
}

func verifyOrAdoptChecksum(ctx context.Context, db *sql.DB, version, expected, rawExpected string, recorded sql.NullString, policy string) error {
	if recorded.Valid && recorded.String != "" {
		if recorded.String == expected {
			return nil
		}
		// The repository historically did not force SQL files to LF. Local
		// Windows checkouts could therefore record a raw CRLF hash. Adopt may
		// canonicalize only that exact same-content raw hash; all other
		// mismatches remain immutable failures.
		if policy == ChecksumPolicyAdopt && rawExpected != expected && recorded.String == rawExpected {
			return updateAdoptedChecksum(ctx, db, version, expected, recorded.String, "canonicalized line endings")
		}
		return fmt.Errorf("migration checksum mismatch for %s: applied migration history is immutable", version)
	}
	if policy != ChecksumPolicyAdopt {
		return fmt.Errorf("migration %s has no recorded checksum; require an explicitly approved one-time adoption before continuing", version)
	}
	return updateAdoptedChecksum(ctx, db, version, expected, "", "adopted legacy checksum")
}

func updateAdoptedChecksum(ctx context.Context, db *sql.DB, version, expected, previous, reason string) error {
	var result sql.Result
	var err error
	if previous == "" {
		result, err = db.ExecContext(ctx, `UPDATE schema_migrations SET checksum_sha256 = $1 WHERE version = $2 AND checksum_sha256 IS NULL`, expected, version)
	} else {
		result, err = db.ExecContext(ctx, `UPDATE schema_migrations SET checksum_sha256 = $1 WHERE version = $2 AND checksum_sha256 = $3`, expected, version, previous)
	}
	if err != nil {
		return fmt.Errorf("failed to adopt checksum for %s: %w", version, err)
	}
	rows, err := result.RowsAffected()
	if err != nil || rows != 1 {
		return fmt.Errorf("failed to adopt checksum for %s: concurrent ledger change", version)
	}
	log.Printf("Adopted canonical checksum for migration %s under explicit policy (%s).", version, reason)
	return nil
}

func ChecksumSHA256(content []byte) string {
	canonical := strings.ReplaceAll(string(content), "\r\n", "\n")
	canonical = strings.ReplaceAll(canonical, "\r", "\n")
	return rawChecksumSHA256([]byte(canonical))
}

func rawChecksumSHA256(content []byte) string {
	digest := sha256.Sum256(content)
	return hex.EncodeToString(digest[:])
}
