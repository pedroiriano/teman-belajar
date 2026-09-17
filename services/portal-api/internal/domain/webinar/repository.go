package webinar

import (
	"context"
)

type Repository interface {
	List(ctx context.Context, filter Filter, subject string) (Page, error)
	GetByID(ctx context.Context, id int, subject string) (Session, error)
	Create(ctx context.Context, input CreateWebinarInput, actor string) (Session, error)
	Update(ctx context.Context, id int, input UpdateWebinarInput, actor string) (Session, error)
	Delete(ctx context.Context, id int, actor string) error
	Register(ctx context.Context, id int, identity Identity, userName, userEmail, key string) (Session, error)
	Cancel(ctx context.Context, id int, identity Identity, key string) (Session, error)
	ListAttendees(ctx context.Context, id int) ([]Attendee, error)
	UpdateAttendance(ctx context.Context, id int, attendeeID string, status string) error
}
