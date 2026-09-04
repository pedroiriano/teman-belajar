package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"teman-belajar-api/internal/domain/schedule"
)

// CompositeEntityPublisher handles publishing individual content items by module.
type CompositeEntityPublisher struct {
	db *sql.DB
}

func NewCompositeEntityPublisher(db *sql.DB) *CompositeEntityPublisher {
	return &CompositeEntityPublisher{db: db}
}

var _ schedule.EntityPublisher = (*CompositeEntityPublisher)(nil)

func (p *CompositeEntityPublisher) PublishEntity(ctx context.Context, entityType string, entityID string) error {
	switch entityType {
	case "knowledge":
		query := `
			UPDATE knowledge_articles
			SET status = 'published', published_revision_no = current_revision_no, updated_at = NOW()
			WHERE id = $1
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	case "news":
		query := `
			UPDATE news
			SET status = 'published', published_at = NOW(), updated_at = NOW()
			WHERE id = $1
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	case "announcements":
		query := `
			UPDATE announcements
			SET status = 'published', updated_at = NOW()
			WHERE id = $1
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	case "faqs":
		query := `
			UPDATE faq_items
			SET status = 'published', updated_at = NOW()
			WHERE id = $1
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	case "training_programs":
		query := `
			UPDATE training_programs
			SET status = 'published', updated_at = NOW()
			WHERE id = $1
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	case "microlearning":
		query := `
			UPDATE microlearning_items
			SET status = 'published', updated_at = NOW()
			WHERE id = $1
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	case "learning_paths":
		query := `
			UPDATE learning_path_versions
			SET status = 'published', published_at = NOW()
			WHERE path_id = $1 AND status != 'published'
		`
		_, err := p.db.ExecContext(ctx, query, entityID)
		return err

	default:
		return fmt.Errorf("unknown entity type for publication: %s", entityType)
	}
}

func runSchedulePublisher(ctx context.Context, service *schedule.Service) {
	run := func() {
		executed, err := service.ExecutePending(ctx, time.Now())
		if err != nil {
			log.Printf("Schedule publisher error: %v", err)
			return
		}
		if executed > 0 {
			log.Printf("Schedule publisher successfully auto-published %d scheduled items", executed)
		}
	}

	// Initial run on startup
	run()

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			run()
		}
	}
}
