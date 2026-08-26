package postgres

import (
	"context"
	"database/sql"
	"errors"
	"time"

	domain "teman-belajar-api/internal/domain/notification"
)

type NotificationRepository struct{ db *sql.DB }

func NewNotificationRepository(db *sql.DB) *NotificationRepository {
	return &NotificationRepository{db: db}
}

type notificationScanner interface{ Scan(...any) error }

const (
	deliverNotificationQuery = `
		INSERT INTO notification.inbox
			(id, user_subject, audience, event_id, schema_version, source, event_type, title, body, deep_link, priority, available_at, expires_at, created_at)
		SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
		WHERE COALESCE((SELECT enabled FROM notification.preferences WHERE user_subject=$2 AND audience=$3 AND event_type=$7), TRUE)
		ON CONFLICT (user_subject, audience, event_id) DO NOTHING
		RETURNING id, audience, event_type, title, body, deep_link, priority, available_at, expires_at, read_at, created_at`
	findDeliveredNotificationQuery = `SELECT id, audience, event_type, title, body, deep_link, priority, available_at, expires_at, read_at, created_at
		FROM notification.inbox WHERE user_subject=$1 AND audience=$2 AND event_id=$3`
	countActiveNotificationsQuery = `SELECT COUNT(*) FROM notification.inbox
		WHERE user_subject=$1 AND audience=$2 AND available_at <= $3 AND expires_at > $3`
	countActiveUnreadNotificationsQuery = `SELECT COUNT(*) FROM notification.inbox
		WHERE user_subject=$1 AND audience=$2 AND available_at <= $3 AND expires_at > $3 AND read_at IS NULL`
	listActiveNotificationsQuery = `SELECT id, audience, event_type, title, body, deep_link, priority, available_at, expires_at, read_at, created_at
		FROM notification.inbox
		WHERE user_subject=$1 AND audience=$2 AND available_at <= $3 AND expires_at > $3
		ORDER BY created_at DESC,id DESC LIMIT $4 OFFSET $5`
	listActiveUnreadNotificationsQuery = `SELECT id, audience, event_type, title, body, deep_link, priority, available_at, expires_at, read_at, created_at
		FROM notification.inbox
		WHERE user_subject=$1 AND audience=$2 AND available_at <= $3 AND expires_at > $3 AND read_at IS NULL
		ORDER BY created_at DESC,id DESC LIMIT $4 OFFSET $5`
	markNotificationReadQuery = `UPDATE notification.inbox SET read_at=COALESCE(read_at,NOW())
		WHERE id=$1 AND user_subject=$2 AND audience=$3 AND available_at<=NOW() AND expires_at>NOW()
		RETURNING id, audience, event_type, title, body, deep_link, priority, available_at, expires_at, read_at, created_at`
)

func scanNotification(row notificationScanner, item *domain.Notification) error {
	return row.Scan(&item.ID, &item.Audience, &item.EventType, &item.Title, &item.Body, &item.DeepLink, &item.Priority, &item.AvailableAt, &item.ExpiresAt, &item.ReadAt, &item.CreatedAt)
}

func (r *NotificationRepository) Deliver(ctx context.Context, input domain.Delivery, item domain.Notification) (domain.DeliveryResult, error) {
	row := r.db.QueryRowContext(ctx, deliverNotificationQuery,
		item.ID, input.UserSubject, input.Audience, input.EventID, input.SchemaVersion, input.Source, input.EventType, item.Title, item.Body, item.DeepLink, item.Priority, item.AvailableAt, item.ExpiresAt, item.CreatedAt)
	var created domain.Notification
	if err := scanNotification(row, &created); err == nil {
		return domain.DeliveryResult{Notification: &created, Created: true}, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return domain.DeliveryResult{}, err
	}
	var existing domain.Notification
	err := scanNotification(r.db.QueryRowContext(ctx, findDeliveredNotificationQuery, input.UserSubject, input.Audience, input.EventID), &existing)
	if err == nil {
		return domain.DeliveryResult{Notification: &existing}, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return domain.DeliveryResult{}, err
	}
	return domain.DeliveryResult{Suppressed: true}, nil
}

func (r *NotificationRepository) List(ctx context.Context, subject string, filter domain.ListFilter) (domain.Page, error) {
	var total, unread int
	countQuery := countActiveNotificationsQuery
	listQuery := listActiveNotificationsQuery
	if filter.Unread {
		countQuery = countActiveUnreadNotificationsQuery
		listQuery = listActiveUnreadNotificationsQuery
	}
	if err := r.db.QueryRowContext(ctx, countQuery, subject, filter.Audience, filter.Now).Scan(&total); err != nil {
		return domain.Page{}, err
	}
	if err := r.db.QueryRowContext(ctx, countActiveUnreadNotificationsQuery, subject, filter.Audience, filter.Now).Scan(&unread); err != nil {
		return domain.Page{}, err
	}
	rows, err := r.db.QueryContext(ctx, listQuery, subject, filter.Audience, filter.Now, filter.PageSize, (filter.Page-1)*filter.PageSize)
	if err != nil {
		return domain.Page{}, err
	}
	defer rows.Close()
	items := make([]domain.Notification, 0, filter.PageSize)
	for rows.Next() {
		var item domain.Notification
		if err := scanNotification(rows, &item); err != nil {
			return domain.Page{}, err
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return domain.Page{}, err
	}
	pages := 0
	if total > 0 {
		pages = (total + filter.PageSize - 1) / filter.PageSize
	}
	return domain.Page{Items: items, Page: filter.Page, PageSize: filter.PageSize, Total: total, TotalPages: pages, UnreadCount: unread}, nil
}

func (r *NotificationRepository) UnreadCount(ctx context.Context, subject string, audience domain.Audience) (int, error) {
	var count int
	err := r.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM notification.inbox WHERE user_subject=$1 AND audience=$2 AND available_at<=NOW() AND expires_at>NOW() AND read_at IS NULL`, subject, audience).Scan(&count)
	return count, err
}

func (r *NotificationRepository) MarkRead(ctx context.Context, subject string, audience domain.Audience, id string) (*domain.Notification, error) {
	var item domain.Notification
	err := scanNotification(r.db.QueryRowContext(ctx, markNotificationReadQuery, id, subject, audience), &item)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *NotificationRepository) MarkAllRead(ctx context.Context, subject string, audience domain.Audience) (int, error) {
	result, err := r.db.ExecContext(ctx, `UPDATE notification.inbox SET read_at=NOW() WHERE user_subject=$1 AND audience=$2 AND available_at<=NOW() AND expires_at>NOW() AND read_at IS NULL`, subject, audience)
	if err != nil {
		return 0, err
	}
	count, err := result.RowsAffected()
	return int(count), err
}

func (r *NotificationRepository) ListPreferences(ctx context.Context, subject string, audience domain.Audience) ([]domain.Preference, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT audience,event_type,enabled,updated_at FROM notification.preferences WHERE user_subject=$1 AND audience=$2 ORDER BY event_type`, subject, audience)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := make([]domain.Preference, 0)
	for rows.Next() {
		var item domain.Preference
		var updatedAt time.Time
		if err := rows.Scan(&item.Audience, &item.EventType, &item.Enabled, &updatedAt); err != nil {
			return nil, err
		}
		item.UpdatedAt = &updatedAt
		items = append(items, item)
	}
	return items, rows.Err()
}

func (r *NotificationRepository) SetPreference(ctx context.Context, subject string, audience domain.Audience, eventType domain.EventType, enabled bool) (domain.Preference, error) {
	var item domain.Preference
	var updatedAt time.Time
	err := r.db.QueryRowContext(ctx, `INSERT INTO notification.preferences(user_subject,audience,event_type,enabled) VALUES($1,$2,$3,$4) ON CONFLICT(user_subject,audience,event_type) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=NOW() RETURNING audience,event_type,enabled,updated_at`, subject, audience, eventType, enabled).Scan(&item.Audience, &item.EventType, &item.Enabled, &updatedAt)
	if err == nil {
		item.UpdatedAt = &updatedAt
	}
	return item, err
}

var _ domain.Repository = (*NotificationRepository)(nil)
