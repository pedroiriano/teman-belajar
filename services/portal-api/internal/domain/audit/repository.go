package audit

import (
	"context"
	"time"
)

type Repository interface {
	CreateEvent(ctx context.Context, event *AuditEvent) error
}

// CenterRepository extends the append-only writer with the bounded operations
// needed by Audit Center. No update operation is intentionally exposed.
type CenterRepository interface {
	Repository
	ListEvents(ctx context.Context, query Query) ([]AuditEvent, error)
	GetEvent(ctx context.Context, id string) (AuditEvent, error)
	DeleteBefore(ctx context.Context, cutoff time.Time, limit int) (int64, error)
}
