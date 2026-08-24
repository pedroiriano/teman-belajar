package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
	"teman-belajar-api/internal/repository/postgres"
)

func main() {
	action := flag.String("action", "", "Action to perform: requeue-dlq")
	eventID := flag.String("event-id", "", "Event ID to requeue")
	flag.Parse()

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Fatal("DATABASE_URL environment variable must be provided")
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	repo := postgres.NewIntegrationRepository(db)
	ctx := context.Background()

	switch *action {
	case "requeue-dlq":
		if *eventID == "" {
			log.Fatal("event-id is required for requeue-dlq")
		}
		err := repo.RequeueDeadLetter(ctx, *eventID)
		if err != nil {
			log.Fatalf("Failed to requeue event %s: %v", *eventID, err)
		}
		fmt.Printf("Successfully requeued dead-letter event: %s\n", *eventID)
	default:
		log.Fatalf("Unknown or missing action: %s", *action)
	}
}
