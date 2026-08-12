package audit

import "context"

type Repository interface {
	CreateEvent(ctx context.Context, event *AuditEvent) error
}
