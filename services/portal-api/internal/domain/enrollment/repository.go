package enrollment

import "context"

type Repository interface {
	Create(ctx context.Context, e *Enrollment) error
	GetByID(ctx context.Context, id string) (*Enrollment, error)
	GetByUserAndProgram(ctx context.Context, userSubject, programSlug string) (*Enrollment, error)
	UpdateStatus(ctx context.Context, id string, status Status, confirmedBy string, rejectionReason string) (*Enrollment, error)
	List(ctx context.Context, filter Filter) ([]Enrollment, int, Metrics, error)
}
