package migrations

import (
	"context"
	"database/sql"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"

	_ "github.com/lib/pq"
)

func TestParseChecksumPolicy(t *testing.T) {
	tests := []struct {
		input string
		want  string
		ok    bool
	}{
		{"", ChecksumPolicyStrict, true},
		{"strict", ChecksumPolicyStrict, true},
		{" ADOPT ", ChecksumPolicyAdopt, true},
		{"ignore", "", false},
	}
	for _, tt := range tests {
		got, err := ParseChecksumPolicy(tt.input)
		if (err == nil) != tt.ok || got != tt.want {
			t.Fatalf("ParseChecksumPolicy(%q) = %q, %v", tt.input, got, err)
		}
	}
}

func TestChecksumSHA256(t *testing.T) {
	got := ChecksumSHA256([]byte("SELECT 1;\n"))
	const want = "b4e0497804e46e0a0b0b8c31975b062152d551bac49c3c2e80932567b4085dcd"
	if got != want {
		t.Fatalf("checksum = %q, want %q", got, want)
	}
	if crlf := ChecksumSHA256([]byte("SELECT 1;\r\n")); crlf != want {
		t.Fatalf("CRLF checksum = %q, want canonical %q", crlf, want)
	}
}

func TestRunChecksumLifecycle(t *testing.T) {
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		t.Skip("TEST_DATABASE_URL is not configured")
	}

	adminDB, err := sql.Open("postgres", dbURL)
	if err != nil {
		t.Fatal(err)
	}
	defer adminDB.Close()

	const schema = "task012_migration_checksum"
	if _, err := adminDB.Exec(`DROP SCHEMA IF EXISTS ` + schema + ` CASCADE`); err != nil {
		t.Fatal(err)
	}
	if _, err := adminDB.Exec(`CREATE SCHEMA ` + schema); err != nil {
		t.Fatal(err)
	}
	defer func() { _, _ = adminDB.Exec(`DROP SCHEMA IF EXISTS ` + schema + ` CASCADE`) }()

	parsed, err := url.Parse(dbURL)
	if err != nil {
		t.Fatal(err)
	}
	query := parsed.Query()
	query.Set("search_path", schema)
	parsed.RawQuery = query.Encode()
	db, err := sql.Open("postgres", parsed.String())
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	dir := t.TempDir()
	path := filepath.Join(dir, "001_create_probe.sql")
	if err := os.WriteFile(path, []byte("CREATE TABLE probe (id INTEGER PRIMARY KEY);\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if err := Run(ctx, db, dir, ChecksumPolicyStrict); err != nil {
		t.Fatalf("initial run: %v", err)
	}

	var checksum string
	if err := db.QueryRow(`SELECT checksum_sha256 FROM schema_migrations WHERE version = '001_create_probe.sql'`).Scan(&checksum); err != nil {
		t.Fatal(err)
	}
	if len(checksum) != 64 {
		t.Fatalf("recorded checksum length = %d", len(checksum))
	}
	if err := Run(ctx, db, dir, ChecksumPolicyStrict); err != nil {
		t.Fatalf("verified rerun: %v", err)
	}

	if err := os.WriteFile(path, []byte("CREATE TABLE probe (id BIGINT PRIMARY KEY);\n"), 0o600); err != nil {
		t.Fatal(err)
	}
	if err := Run(ctx, db, dir, ChecksumPolicyStrict); err == nil || !strings.Contains(err.Error(), "checksum mismatch") {
		t.Fatalf("mutated migration error = %v", err)
	}
	if _, err := db.Exec(`UPDATE schema_migrations SET checksum_sha256 = NULL WHERE version = '001_create_probe.sql'`); err != nil {
		t.Fatal(err)
	}
	if err := Run(ctx, db, dir, ChecksumPolicyStrict); err == nil || !strings.Contains(err.Error(), "no recorded checksum") {
		t.Fatalf("strict legacy error = %v", err)
	}
	if err := Run(ctx, db, dir, ChecksumPolicyAdopt); err != nil {
		t.Fatalf("adopt legacy checksum: %v", err)
	}
	contentWithCRLF := []byte("CREATE TABLE probe (id BIGINT PRIMARY KEY);\r\n")
	if err := os.WriteFile(path, contentWithCRLF, 0o600); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE schema_migrations SET checksum_sha256 = $1 WHERE version = '001_create_probe.sql'`, rawChecksumSHA256(contentWithCRLF)); err != nil {
		t.Fatal(err)
	}
	if err := Run(ctx, db, dir, ChecksumPolicyStrict); err == nil || !strings.Contains(err.Error(), "checksum mismatch") {
		t.Fatalf("strict raw line-ending error = %v", err)
	}
	if err := Run(ctx, db, dir, ChecksumPolicyAdopt); err != nil {
		t.Fatalf("adopt raw line-ending checksum: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO schema_migrations (version, checksum_sha256) VALUES ('999_missing.sql', repeat('a', 64))`); err != nil {
		t.Fatal(err)
	}
	if err := Run(ctx, db, dir, ChecksumPolicyStrict); err == nil || !strings.Contains(err.Error(), "canonical SQL file is missing") {
		t.Fatalf("orphaned ledger error = %v", err)
	}
}
