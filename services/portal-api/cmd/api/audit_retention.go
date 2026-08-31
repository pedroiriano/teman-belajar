package main

import (
	"context"
	"log"
	"time"

	"teman-belajar-api/internal/application/auditcenter"
	"teman-belajar-api/internal/observability"
)

func runAuditRetention(ctx context.Context, service *auditcenter.Service) {
	run := func() {
		removed, err := service.PurgeExpired(ctx)
		if err != nil {
			log.Printf("Audit retention failed")
			observability.RecordAuditCenter("retention", "failed")
			return
		}
		observability.RecordAuditCenter("retention", "success")
		if removed > 0 {
			log.Printf("Audit retention removed %d expired records", removed)
		}
	}
	run()
	ticker := time.NewTicker(24 * time.Hour)
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
