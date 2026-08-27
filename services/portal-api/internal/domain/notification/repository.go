package notification

import (
	"context"
	"time"
)

type Repository interface {
	Deliver(context.Context, Delivery, Notification) (DeliveryResult, error)
	CancelPending(context.Context, string, Audience, []string, time.Time) (int, error)
	List(context.Context, string, ListFilter) (Page, error)
	UnreadCount(context.Context, string, Audience) (int, error)
	MarkRead(context.Context, string, Audience, string) (*Notification, error)
	MarkAllRead(context.Context, string, Audience) (int, error)
	ListPreferences(context.Context, string, Audience) ([]Preference, error)
	SetPreference(context.Context, string, Audience, EventType, bool) (Preference, error)
}
