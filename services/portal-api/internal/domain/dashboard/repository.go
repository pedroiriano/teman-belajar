package dashboard

import "context"

// Repository defines the data-access contract for the admin dashboard summary and workflow board.
type Repository interface {
	GetSummary(ctx context.Context, reviewLimit int) (*Summary, error)
	GetWorkflowItems(ctx context.Context, filter WorkflowFilter) ([]WorkflowItem, error)
}
