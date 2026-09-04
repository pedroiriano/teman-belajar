package schedule

import (
	"context"
	"time"
)

// Repository defines data access for publication schedules.
type Repository interface {
	List(ctx context.Context, month string, entityType string) ([]ScheduleEvent, error)
	Create(ctx context.Context, event ScheduleEvent) (*ScheduleEvent, error)
	GetByID(ctx context.Context, id string) (*ScheduleEvent, error)
	GetPendingExecution(ctx context.Context, cutoff time.Time, limit int) ([]ScheduleEvent, error)
	MarkExecuted(ctx context.Context, id string, executedAt time.Time) error
	MarkFailed(ctx context.Context, id string, reason string) error
	Cancel(ctx context.Context, id string) error
}
